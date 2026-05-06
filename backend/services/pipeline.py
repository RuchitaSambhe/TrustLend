"""
TrustLend Loan Pipeline - Orchestrates the complete loan processing workflow.

Steps: Document Processing → Cross-Validation → Credit Scoring →
       Fraud Detection → Trust Score → Decision → EMI Plans → Audit Trail
"""

import time
import uuid
from datetime import datetime, timezone

from services.document_processor import DocumentProcessor
from services.credit_scoring import CreditScorer
from services.fraud_detection import FraudDetector
from services.trust_score_engine import TrustScoreEngine
from services.decision_engine import DecisionEngine
from services.emi_planner import EMIPlanner
from services.database import ApplicationDB

# Database instance
_db = ApplicationDB()


class LoanPipeline:
    """Orchestrates the full loan underwriting pipeline."""

    def __init__(self):
        self.doc_processor = DocumentProcessor()
        self.credit_scorer = CreditScorer()
        self.fraud_detector = FraudDetector()
        self.trust_engine = TrustScoreEngine()
        self.decision_engine = DecisionEngine()
        self.emi_planner = EMIPlanner()

    async def process(self, applicant_info: dict, documents: list[dict]) -> dict:
        """Run the complete loan processing pipeline."""
        application_id = str(uuid.uuid4())
        audit_trail = []
        extracted_docs = []
        credit_data = {}
        fraud_data = {"fraud_flag": False, "signals": [], "synthetic_id_score": 0.0}
        trust_result = {"trust_score": 0, "breakdown": {}, "risk_tier": "very_poor"}
        decision_result = {"decision": "rejected", "reason": "Processing incomplete"}
        emi_plans = []

        # Step 1: Document Processing
        start = time.perf_counter()
        try:
            applicant_name = applicant_info.get("name", "Unknown")
            for doc in documents:
                file_bytes = doc.get("file_bytes", b"")
                filename = doc.get("filename", "unknown.pdf")
                extraction = await self.doc_processor.extract(file_bytes, filename)
                # When using mock docs, override name with applicant's actual name
                if len(file_bytes) < 10 and "name" in extraction:
                    extraction["name"] = applicant_name
                extracted_docs.append(extraction)
            audit_trail.append(self._audit_entry(
                "document_processing", start,
                f"Processed {len(extracted_docs)} documents successfully"
            ))
        except Exception as e:
            audit_trail.append(self._audit_entry(
                "document_processing", start, f"Error: {str(e)}"
            ))

        # Step 2: Cross-Validation (name consistency)
        start = time.perf_counter()
        try:
            cross_validation = self._cross_validate(applicant_info, extracted_docs)
            audit_trail.append(self._audit_entry(
                "cross_validation", start, cross_validation
            ))
        except Exception as e:
            audit_trail.append(self._audit_entry(
                "cross_validation", start, f"Error: {str(e)}"
            ))

        # Step 3: Credit Scoring
        start = time.perf_counter()
        try:
            pan_number = self._find_pan(extracted_docs)
            applicant_name = applicant_info.get("name", "Unknown")
            credit_data = await self.credit_scorer.get_score(pan_number, applicant_name)

            # Override with user-provided CIBIL score if available
            user_cibil = applicant_info.get("cibil_score")
            if user_cibil and user_cibil > 0:
                credit_data["credit_score"] = user_cibil
                if user_cibil >= 750:
                    credit_data["risk_category"] = "low"
                elif user_cibil >= 650:
                    credit_data["risk_category"] = "medium"
                else:
                    credit_data["risk_category"] = "high"

            audit_trail.append(self._audit_entry(
                "credit_scoring", start,
                f"Credit score: {credit_data.get('credit_score', 'N/A')}, "
                f"Risk: {credit_data.get('risk_category', 'unknown')}"
            ))
        except Exception as e:
            credit_data = {"credit_score": applicant_info.get("cibil_score", 500), "active_loans": 0, "risk_category": "unknown"}
            audit_trail.append(self._audit_entry(
                "credit_scoring", start, f"Error (using defaults): {str(e)}"
            ))

        # Step 4: Fraud Detection
        start = time.perf_counter()
        try:
            fraud_input = {
                "name": applicant_info.get("name", ""),
                "pan_number": self._find_pan(extracted_docs),
                "aadhaar_number": self._find_aadhaar(extracted_docs),
                "phone": applicant_info.get("phone", ""),
                "documents": extracted_docs,
            }
            fraud_data = await self.fraud_detector.check(fraud_input)
            audit_trail.append(self._audit_entry(
                "fraud_detection", start,
                f"Fraud flag: {fraud_data.get('fraud_flag')}, "
                f"Risk: {fraud_data.get('risk_level')}, "
                f"Signals: {len(fraud_data.get('signals', []))}"
            ))
        except Exception as e:
            audit_trail.append(self._audit_entry(
                "fraud_detection", start, f"Error: {str(e)}"
            ))

        # Step 5: Trust Score Calculation
        start = time.perf_counter()
        try:
            loan_request = {
                "loan_amount": applicant_info.get("loan_amount", 100000),
                "tenure_months": applicant_info.get("tenure_months", 12),
                "monthly_income": applicant_info.get("monthly_income", 0),
            }
            trust_result = await self.trust_engine.calculate(
                credit_data=credit_data,
                doc_data=extracted_docs,
                fraud_data=fraud_data,
                loan_request=loan_request,
            )
            audit_trail.append(self._audit_entry(
                "trust_score_calculation", start,
                f"Trust score: {trust_result.get('trust_score')}/100, "
                f"Tier: {trust_result.get('risk_tier')}"
            ))
        except Exception as e:
            audit_trail.append(self._audit_entry(
                "trust_score_calculation", start, f"Error: {str(e)}"
            ))

        # Step 6: Decision
        start = time.perf_counter()
        try:
            decision_result = await self.decision_engine.decide(trust_result, fraud_data)
            audit_trail.append(self._audit_entry(
                "decision", start,
                f"Decision: {decision_result.get('decision')}"
            ))
        except Exception as e:
            decision_result = {"decision": "manual_review", "reason": f"Error in decision: {str(e)}", "confidence": 0.0}
            audit_trail.append(self._audit_entry(
                "decision", start, f"Error: {str(e)}"
            ))

        # Step 7: EMI Plans (only if approved)
        start = time.perf_counter()
        try:
            if decision_result.get("decision") == "approved":
                # Prefer user-provided income, fall back to doc extraction
                monthly_income = applicant_info.get("monthly_income", 0)
                if not monthly_income or monthly_income <= 0:
                    monthly_income = self._get_monthly_income(extracted_docs)
                emi_plans = await self.emi_planner.generate_plans(
                    loan_amount=applicant_info.get("loan_amount", 100000),
                    trust_score=trust_result.get("trust_score", 50),
                    monthly_income=monthly_income,
                )
                audit_trail.append(self._audit_entry(
                    "emi_planning", start,
                    f"Generated {len(emi_plans)} plans"
                ))
            else:
                audit_trail.append(self._audit_entry(
                    "emi_planning", start, "Skipped (not approved)"
                ))
        except Exception as e:
            audit_trail.append(self._audit_entry(
                "emi_planning", start, f"Error: {str(e)}"
            ))

        # Build final response
        now = datetime.now(timezone.utc).isoformat()
        response = {
            "application_id": application_id,
            "status": "completed",
            "applicant_name": applicant_info.get("name", "Unknown"),
            "trust_score": trust_result.get("trust_score", 0),
            "trust_score_breakdown": trust_result.get("breakdown", {}),
            "decision": decision_result.get("decision", "manual_review"),
            "decision_reason": decision_result.get("reason", ""),
            "emi_plans": emi_plans,
            "fraud_signals": fraud_data.get("signals", []),
            "documents_verified": [
                {"doc_type": d.get("doc_type"), "confidence": d.get("confidence", 0)}
                for d in extracted_docs
            ],
            "audit_trail": audit_trail,
            "compliance": {
                "rbi_codes": ["RBI/2023-24/85", "RBI/DOR/FIN/2024-25/01"],
                "dpdp_compliant": True,
            },
            "created_at": now,
        }

        # Store in database
        _db.save(response)

        return response

    def _cross_validate(self, applicant_info: dict, docs: list[dict]) -> str:
        """Check name consistency across applicant info and documents."""
        app_name = applicant_info.get("name", "").lower().strip()
        mismatches = []

        for doc in docs:
            doc_name = doc.get("name", "")
            if doc_name and doc_name.lower().strip() != app_name:
                app_parts = set(app_name.split())
                doc_parts = set(doc_name.lower().strip().split())
                if not app_parts.intersection(doc_parts):
                    mismatches.append(doc.get("doc_type", "unknown"))

        if mismatches:
            return f"Name mismatch in: {', '.join(mismatches)}"
        return "All names consistent across documents"

    def _find_pan(self, docs: list[dict]) -> str:
        """Extract PAN number from document extractions."""
        for doc in docs:
            if doc.get("doc_type") == "pan":
                return doc.get("pan_number", "UNKNOWN0000X")
        return "UNKNOWN0000X"

    def _find_aadhaar(self, docs: list[dict]) -> str:
        """Extract Aadhaar number from document extractions."""
        for doc in docs:
            if doc.get("doc_type") == "aadhaar":
                return doc.get("aadhaar_number", "")
        return ""

    def _get_monthly_income(self, docs: list[dict]) -> float:
        """Get monthly income from bank statement extraction."""
        for doc in docs:
            if doc.get("doc_type") == "bank_statement":
                return doc.get("monthly_income", 30000)
        return 30000

    def _audit_entry(self, step: str, start_time: float, result: str) -> dict:
        """Create a timestamped audit trail entry."""
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "step": step,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "result": result,
            "duration_ms": duration_ms,
        }


def get_application(application_id: str) -> dict | None:
    """Retrieve a stored application by ID."""
    return _db.get(application_id)


def get_all_applications() -> dict:
    """Return all stored applications."""
    apps = _db.list_all()
    return {a.get("application_id", ""): a for a in apps}
