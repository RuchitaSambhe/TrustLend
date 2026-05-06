"""
TrustLend Decision Engine - Automated loan decision based on trust score and fraud data.
"""


class DecisionEngine:
    """Makes loan approval decisions based on trust score and fraud signals."""

    async def decide(self, trust_score_result: dict, fraud_data: dict) -> dict:
        """Determine loan decision from trust score and fraud analysis."""
        trust_score = trust_score_result.get("trust_score", 0)
        fraud_flag = fraud_data.get("fraud_flag", False)
        risk_tier = trust_score_result.get("risk_tier", "very_poor")
        confidence = trust_score_result.get("confidence", 0.0)

        # Rejection conditions
        if fraud_flag:
            return {
                "decision": "rejected",
                "reason": (
                    "Application rejected due to fraud indicators detected during verification. "
                    f"Fraud risk level: {fraud_data.get('risk_level', 'unknown')}."
                ),
                "confidence": confidence,
            }

        if trust_score < 45:
            return {
                "decision": "rejected",
                "reason": (
                    f"Application rejected due to insufficient trust score ({trust_score}/100). "
                    f"Risk tier: {risk_tier}. Key factors: low credit score, "
                    "inadequate income coverage, or documentation gaps."
                ),
                "confidence": confidence,
            }

        # Approval condition
        if trust_score >= 70:
            return {
                "decision": "approved",
                "reason": (
                    f"Application approved with trust score {trust_score}/100 ({risk_tier} tier). "
                    "All verification signals meet lending criteria."
                ),
                "confidence": confidence,
            }

        # Manual review: score 45-69
        return {
            "decision": "manual_review",
            "reason": (
                f"Application requires manual review. Trust score {trust_score}/100 ({risk_tier} tier) "
                "falls in the borderline range. Additional documentation or verification may be needed."
            ),
            "confidence": confidence,
        }
