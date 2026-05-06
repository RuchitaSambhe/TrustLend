from pydantic import BaseModel
from typing import Optional


class ApplicantInfo(BaseModel):
    name: str
    phone: str
    loan_amount: float
    loan_purpose: str
    tenure_months: int


class DocumentExtraction(BaseModel):
    doc_type: str
    fields: dict
    confidence: float


class ApplicationResponse(BaseModel):
    application_id: str
    status: str
    trust_score: Optional[float] = None
    decision: Optional[str] = None
    emi_plans: Optional[list] = None
    audit_trail: Optional[list] = None
