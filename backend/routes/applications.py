"""
TrustLend Application Routes - API endpoints for loan processing.
"""

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.pipeline import LoanPipeline, get_application, get_all_applications

router = APIRouter(prefix="/api", tags=["applications"])

pipeline = LoanPipeline()


@router.post("/apply")
async def apply_for_loan(
    name: str = Form(...),
    phone: str = Form(...),
    loan_amount: float = Form(...),
    loan_purpose: str = Form(...),
    tenure_months: int = Form(36),
    monthly_income: float = Form(50000),
    cibil_score: int = Form(700),
    documents: list[UploadFile] = File(default=[]),
):
    """Submit a loan application with documents."""
    applicant_info = {
        "name": name,
        "phone": phone,
        "loan_amount": loan_amount,
        "loan_purpose": loan_purpose,
        "tenure_months": tenure_months,
        "monthly_income": monthly_income,
        "cibil_score": cibil_score,
    }

    # Process uploaded files or use mock documents
    doc_list = []
    has_real_files = (
        documents is not None
        and len(documents) > 0
        and documents[0].filename
        and documents[0].filename != ""
    )
    if has_real_files:
        for doc in documents:
            file_bytes = await doc.read()
            if len(file_bytes) > 0:
                doc_list.append({
                    "filename": doc.filename or "unknown.pdf",
                "file_bytes": file_bytes,
            })
    else:
        # Mock documents for demo when no files uploaded
        doc_list = [
            {"filename": "aadhaar_card.jpg", "file_bytes": b"mock"},
            {"filename": "pan_card.pdf", "file_bytes": b"mock"},
            {"filename": "bank_statement.pdf", "file_bytes": b"mock"},
        ]

    result = await pipeline.process(applicant_info, doc_list)
    return result


@router.get("/application/{application_id}")
async def get_application_by_id(application_id: str):
    """Retrieve a processed application by ID."""
    app = get_application(application_id)
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.get("/applications")
async def list_applications():
    """List all processed applications (lender dashboard)."""
    apps = get_all_applications()
    return {"total": len(apps), "applications": list(apps.values())}


@router.post("/demo/{scenario}")
async def run_demo_scenario(scenario: str):
    """Run a pre-configured demo scenario."""
    scenarios = {
        "approved": _approved_scenario,
        "rejected": _rejected_scenario,
        "borderline": _borderline_scenario,
    }

    if scenario not in scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario. Choose from: {list(scenarios.keys())}",
        )

    applicant_info, doc_list = scenarios[scenario]()
    result = await pipeline.process(applicant_info, doc_list)
    return result


def _approved_scenario() -> tuple[dict, list[dict]]:
    """Good PAN (ends with 8), clean docs, income 80k, loan 10L."""
    applicant_info = {
        "name": "Rajesh Kumar",
        "phone": "9876543210",
        "loan_amount": 1000000,
        "loan_purpose": "home_renovation",
        "tenure_months": 36,
    }
    doc_list = [
        {"filename": "aadhaar_card.jpg", "file_bytes": b"mock"},
        {"filename": "pan_good_card.pdf", "file_bytes": b"mock"},
        {"filename": "bank_statement_high.pdf", "file_bytes": b"mock"},
    ]
    return applicant_info, doc_list


def _rejected_scenario() -> tuple[dict, list[dict]]:
    """PAN starts with FRAUD, mismatched names."""
    applicant_info = {
        "name": "Suspicious Person",
        "phone": "9000000000",
        "loan_amount": 5000000,
        "loan_purpose": "business",
        "tenure_months": 12,
    }
    doc_list = [
        {"filename": "aadhaar_card.jpg", "file_bytes": b"mock"},
        {"filename": "pan_card_FRAUD.pdf", "file_bytes": b"mock"},
        {"filename": "bank_statement.pdf", "file_bytes": b"mock"},
    ]
    return applicant_info, doc_list


def _borderline_scenario() -> tuple[dict, list[dict]]:
    """Medium PAN (ends with 5), income 45k, loan 15L."""
    applicant_info = {
        "name": "Rajesh Kumar",
        "phone": "9876500000",
        "loan_amount": 1500000,
        "loan_purpose": "education",
        "tenure_months": 48,
    }
    doc_list = [
        {"filename": "aadhaar_card.jpg", "file_bytes": b"mock"},
        {"filename": "pan_medium_card.pdf", "file_bytes": b"mock"},
        {"filename": "bank_statement_low.pdf", "file_bytes": b"mock"},
    ]
    return applicant_info, doc_list
