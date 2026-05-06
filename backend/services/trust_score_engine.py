"""
TrustLend Trust Score Engine - Weighted Multi-Signal Fusion with LLM Explainability.

This is the core differentiator: combines credit bureau data, document verification,
fraud signals, and income adequacy into a single explainable trust score.
"""

from config import settings
from services.bedrock_llm import get_trust_score_reasoning


class TrustScoreEngine:
    """Calculates a unified trust score using weighted multi-signal fusion."""

    WEIGHTS = {
        "credit": 0.35,
        "documents": 0.25,
        "fraud_inverse": 0.25,
        "income": 0.15,
    }

    REQUIRED_DOC_TYPES = {"aadhaar", "pan", "bank_statement"}

    async def calculate(
        self,
        credit_data: dict,
        doc_data: list[dict],
        fraud_data: dict,
        loan_request: dict,
    ) -> dict:
        """Calculate the trust score from all input signals."""
        # Step 1: Normalize signals
        credit_norm = self._normalize_credit(credit_data)
        doc_norm = self._normalize_documents(doc_data)
        fraud_norm = self._normalize_fraud(fraud_data)
        income_norm = self._normalize_income(credit_data, doc_data, loan_request)

        # Step 2: Weighted fusion
        base_score = (
            credit_norm * self.WEIGHTS["credit"]
            + doc_norm * self.WEIGHTS["documents"]
            + fraud_norm * self.WEIGHTS["fraud_inverse"]
            + income_norm * self.WEIGHTS["income"]
        )

        # Step 3: LLM adjustment
        if not settings.MOCK_MODE:
            # Use Bedrock Claude for real LLM reasoning
            llm_signals = {
                "credit_normalized": round(credit_norm, 2),
                "document_normalized": round(doc_norm, 2),
                "fraud_normalized": round(fraud_norm, 2),
                "income_normalized": round(income_norm, 2),
                "base_score": round(base_score, 2),
                "credit_score_raw": credit_data.get("credit_score", 0),
                "loan_amount": loan_request.get("loan_amount", 0),
                "tenure_months": loan_request.get("tenure_months", 12),
            }
            llm_result = get_trust_score_reasoning(llm_signals)
            adjustment = llm_result["adjustment"]
            reasoning = llm_result["reasoning"]
        else:
            # Mock deterministic adjustment
            adjustment, reasoning = self._llm_adjustment(
                credit_norm, doc_norm, fraud_norm, income_norm, base_score, credit_data, loan_request
            )

        # Step 4: Final score with hard cap and clamping
        final_score = base_score + adjustment
        if fraud_norm < 50:
            final_score = min(final_score, 40)
        final_score = int(max(0, min(100, final_score)))

        # Confidence based on data completeness
        confidence = self._compute_confidence(doc_data, credit_data, fraud_data)

        # Risk tier
        risk_tier = self._risk_tier(final_score)

        return {
            "trust_score": final_score,
            "breakdown": {
                "credit": {
                    "raw": credit_data.get("credit_score", 0),
                    "normalized": round(credit_norm, 2),
                    "weight": self.WEIGHTS["credit"],
                    "contribution": round(credit_norm * self.WEIGHTS["credit"], 2),
                },
                "documents": {
                    "raw": round(self._raw_doc_score(doc_data), 2),
                    "normalized": round(doc_norm, 2),
                    "weight": self.WEIGHTS["documents"],
                    "contribution": round(doc_norm * self.WEIGHTS["documents"], 2),
                },
                "fraud_inverse": {
                    "raw": round(1 - fraud_data.get("synthetic_id_score", 0), 2),
                    "normalized": round(fraud_norm, 2),
                    "weight": self.WEIGHTS["fraud_inverse"],
                    "contribution": round(fraud_norm * self.WEIGHTS["fraud_inverse"], 2),
                },
                "income": {
                    "raw": round(self._raw_income_ratio(credit_data, doc_data, loan_request), 2),
                    "normalized": round(income_norm, 2),
                    "weight": self.WEIGHTS["income"],
                    "contribution": round(income_norm * self.WEIGHTS["income"], 2),
                },
            },
            "llm_adjustment": adjustment,
            "llm_reasoning": reasoning,
            "confidence": confidence,
            "risk_tier": risk_tier,
        }

    def _normalize_credit(self, credit_data: dict) -> float:
        """Map credit score 300-900 to 0-100."""
        score = credit_data.get("credit_score", 300)
        return max(0.0, min(100.0, (score - 300) / 6.0))

    def _normalize_documents(self, doc_data: list[dict]) -> float:
        """Average confidence * 100, minus 10 per missing required doc."""
        if not doc_data:
            return 0.0

        confidences = [d.get("confidence", 0.0) for d in doc_data]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        base = avg_confidence * 100

        # Check for missing required docs
        present_types = {d.get("doc_type", "") for d in doc_data}
        missing_count = len(self.REQUIRED_DOC_TYPES - present_types)
        penalty = missing_count * 10

        return max(0.0, min(100.0, base - penalty))

    def _normalize_fraud(self, fraud_data: dict) -> float:
        """(1 - synthetic_id_score) * 100, minus 20 per fraud signal."""
        synthetic_score = fraud_data.get("synthetic_id_score", 0.0)
        base = (1 - synthetic_score) * 100

        signals = fraud_data.get("signals", [])
        penalty = len(signals) * 20

        return max(0.0, min(100.0, base - penalty))

    def _normalize_income(self, credit_data: dict, doc_data: list[dict], loan_request: dict) -> float:
        """min(100, (monthly_income - existing_emis) / requested_emi_estimate * 50)."""
        # Prefer user-provided monthly_income from loan_request, then doc extraction
        monthly_income = loan_request.get("monthly_income", 0)
        if not monthly_income or monthly_income <= 0:
            monthly_income = self._get_monthly_income(doc_data)
        existing_emis = credit_data.get("active_loans", 0) * 5000  # estimate per loan
        # Also check doc-level EMI data
        for doc in doc_data:
            if doc.get("doc_type") == "bank_statement":
                existing_emis = doc.get("loan_emis_existing", existing_emis)
                break

        loan_amount = loan_request.get("loan_amount", 100000)
        tenure = loan_request.get("tenure_months", 12)
        emi_estimate = (loan_amount / tenure) * 1.1

        if emi_estimate <= 0:
            return 100.0

        ratio = (monthly_income - existing_emis) / emi_estimate * 50
        return max(0.0, min(100.0, ratio))

    def _get_monthly_income(self, doc_data: list[dict]) -> float:
        """Extract monthly income from bank statement doc if available."""
        for doc in doc_data:
            if doc.get("doc_type") == "bank_statement":
                return doc.get("monthly_income", 0)
        return 30000  # default assumption

    def _raw_doc_score(self, doc_data: list[dict]) -> float:
        """Raw average confidence for breakdown display."""
        if not doc_data:
            return 0.0
        confidences = [d.get("confidence", 0.0) for d in doc_data]
        return sum(confidences) / len(confidences)

    def _raw_income_ratio(self, credit_data: dict, doc_data: list[dict], loan_request: dict) -> float:
        """Raw income-to-EMI ratio for breakdown display."""
        monthly_income = loan_request.get("monthly_income", 0)
        if not monthly_income or monthly_income <= 0:
            monthly_income = self._get_monthly_income(doc_data)
        existing_emis = 0
        for doc in doc_data:
            if doc.get("doc_type") == "bank_statement":
                existing_emis = doc.get("loan_emis_existing", 0)
                break

        loan_amount = loan_request.get("loan_amount", 100000)
        tenure = loan_request.get("tenure_months", 12)
        emi_estimate = (loan_amount / tenure) * 1.1

        if emi_estimate <= 0:
            return 0.0
        return (monthly_income - existing_emis) / emi_estimate

    def _llm_adjustment(
        self,
        credit_norm: float,
        doc_norm: float,
        fraud_norm: float,
        income_norm: float,
        base_score: float,
        credit_data: dict,
        loan_request: dict,
    ) -> tuple[int, str]:
        """Mock LLM adjustment: deterministic edge-case analysis."""
        adjustment = 0
        reasons = []
        credit_score = credit_data.get("credit_score", 0)

        # Edge case: great credit but low income adequacy
        if credit_norm > 75 and income_norm < 40:
            adjustment -= 5
            reasons.append(
                f"Strong credit history ({credit_score}) but income adequacy is low "
                f"relative to the requested loan amount, suggesting conservative lending."
            )

        # Edge case: low credit but strong income
        elif credit_norm < 50 and income_norm > 75:
            adjustment += 5
            reasons.append(
                f"Credit score ({credit_score}) is below average, but strong income adequacy "
                f"indicates capacity to service the loan comfortably."
            )

        # All signals consistent and strong
        if credit_norm > 70 and doc_norm > 70 and fraud_norm > 80 and income_norm > 60:
            adjustment += 3
            reasons.append(
                "All verification signals are consistent and strong, indicating a reliable applicant profile."
            )

        # Weak documents despite good credit
        if doc_norm < 50 and credit_norm > 60:
            adjustment -= 3
            reasons.append(
                "Document verification confidence is below expectations despite reasonable credit, "
                "suggesting incomplete or unclear documentation."
            )

        # Fraud concern with otherwise decent profile
        if fraud_norm < 70 and credit_norm > 60:
            adjustment -= 5
            reasons.append(
                "Fraud detection signals present despite decent credit profile. "
                "Additional verification recommended before approval."
            )

        # Clamp adjustment to -10 to +10
        adjustment = max(-10, min(10, adjustment))

        # Build reasoning string
        if not reasons:
            reasons.append(
                f"Credit profile ({credit_score}) aligns with documentation and income signals. "
                f"No significant edge cases detected in the application. "
                f"Standard risk assessment applies."
            )

        reasoning = " ".join(reasons[:2])  # Keep to 2-3 sentences max

        return adjustment, reasoning

    def _compute_confidence(self, doc_data: list[dict], credit_data: dict, fraud_data: dict) -> float:
        """Confidence in the score based on data completeness."""
        score = 0.0

        # Documents present and high confidence
        if doc_data:
            avg_conf = sum(d.get("confidence", 0) for d in doc_data) / len(doc_data)
            score += avg_conf * 0.4

        # Credit data available
        if credit_data.get("credit_score", 0) > 0:
            score += 0.3

        # Fraud check completed
        if "fraud_flag" in fraud_data:
            score += 0.2

        # All required docs present
        present_types = {d.get("doc_type", "") for d in doc_data} if doc_data else set()
        if self.REQUIRED_DOC_TYPES.issubset(present_types):
            score += 0.1

        return round(min(score, 1.0), 2)

    def _risk_tier(self, score: int) -> str:
        """Map final score to risk tier."""
        if score >= 80:
            return "excellent"
        elif score >= 70:
            return "good"
        elif score >= 60:
            return "fair"
        elif score >= 45:
            return "poor"
        else:
            return "very_poor"
