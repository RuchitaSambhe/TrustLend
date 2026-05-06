import re
import random
from typing import Any

import boto3

from config import settings


class DocumentProcessor:
    """Processes uploaded documents via OCR (Textract) or mock extraction."""

    def __init__(self):
        if not settings.MOCK_MODE:
            self._textract = boto3.client("textract", region_name=settings.AWS_REGION)

    async def extract(self, file_bytes: bytes, filename: str) -> dict:
        """Extract structured data from a document image/PDF."""
        if settings.MOCK_MODE:
            return self._mock_extract(filename)
        # Use mock for demo/fake data (less than 10 bytes), real Textract for actual files
        if len(file_bytes) < 10:
            return self._mock_extract(filename)
        return self._textract_extract(file_bytes, filename)

    def _mock_extract(self, filename: str) -> dict:
        """Return realistic fake data based on filename keywords."""
        name_lower = filename.lower()
        confidence = round(random.uniform(0.92, 0.98), 2)

        if "aadhaar" in name_lower:
            return {
                "doc_type": "aadhaar",
                "name": "Rajesh Kumar",
                "aadhaar_number": "XXXX-XXXX-4532",
                "address": "42 MG Road, Bangalore 560001",
                "dob": "1990-05-15",
                "gender": "Male",
                "confidence": confidence,
            }
        elif "pan" in name_lower:
            # If filename also contains "fraud", return a fraud-flagged PAN
            if "fraud" in name_lower:
                pan_number = "FRAUDX1234"
                pan_name = "Suspicious Person"
            elif "medium" in name_lower:
                pan_number = "XYZPK5765A"  # Last digit 5 -> medium score
                pan_name = "Rajesh Kumar"
            elif "good" in name_lower:
                pan_number = "ABCPK8918Z"  # Last digit 8 -> good score
                pan_name = "Rajesh Kumar"
            else:
                pan_number = "ABCPK1234F"
                pan_name = "Rajesh Kumar"
            return {
                "doc_type": "pan",
                "name": pan_name,
                "pan_number": pan_number,
                "father_name": "Suresh Kumar",
                "dob": "1990-05-15",
                "confidence": confidence,
            }
        elif "bank" in name_lower:
            # Support different income levels for scenarios
            if "low" in name_lower:
                monthly_income = 45000
                monthly_expenses = 30000
            elif "high" in name_lower:
                monthly_income = 80000
                monthly_expenses = 35000
            else:
                monthly_income = 62000
                monthly_expenses = 38000
            return {
                "doc_type": "bank_statement",
                "name": "Rajesh Kumar",
                "account_number": "XXXX4567",
                "bank": "SBI",
                "avg_monthly_balance": 45000,
                "monthly_income": monthly_income,
                "monthly_expenses": monthly_expenses,
                "loan_emis_existing": 8000,
                "confidence": confidence,
            }
        elif "gst" in name_lower:
            return {
                "doc_type": "gst",
                "gst_number": "29ABCPK1234F1Z5",
                "business_name": "Kumar Enterprises",
                "annual_turnover": 1800000,
                "filing_status": "regular",
                "confidence": confidence,
            }
        else:
            return {
                "doc_type": "unknown",
                "raw_text": "Could not classify document",
                "confidence": round(random.uniform(0.3, 0.5), 2),
            }

    def _textract_extract(self, file_bytes: bytes, filename: str) -> dict:
        """Use AWS Textract to extract text, then parse fields."""
        response = self._textract.detect_document_text(
            Document={"Bytes": file_bytes}
        )

        # Collect all detected text lines
        lines = []
        for block in response.get("Blocks", []):
            if block["BlockType"] == "LINE":
                lines.append(block.get("Text", ""))

        full_text = "\n".join(lines)
        return self._classify_and_extract(full_text)

    def _classify_and_extract(self, text: str) -> dict:
        """Classify document type from raw text and extract fields."""
        text_lower = text.lower()
        confidence = round(random.uniform(0.75, 0.92), 2)

        if "aadhaar" in text_lower or "unique identification" in text_lower:
            return self._extract_aadhaar(text, confidence)
        elif "income tax" in text_lower or "permanent account" in text_lower:
            return self._extract_pan(text, confidence)
        elif "statement" in text_lower and ("account" in text_lower or "bank" in text_lower):
            return self._extract_bank_statement(text, confidence)
        elif "gst" in text_lower or "goods and services" in text_lower:
            return self._extract_gst(text, confidence)
        else:
            return {
                "doc_type": "unknown",
                "raw_text": text[:500],
                "confidence": round(random.uniform(0.2, 0.4), 2),
            }

    def _extract_aadhaar(self, text: str, confidence: float) -> dict:
        """Extract Aadhaar card fields from OCR text."""
        name_match = re.search(r"(?:name|नाम)[:\s]*([A-Za-z\s]+)", text, re.IGNORECASE)
        aadhaar_match = re.search(r"(\d{4}[\s-]?\d{4}[\s-]?\d{4})", text)
        dob_match = re.search(r"(\d{2}[/-]\d{2}[/-]\d{4})", text)
        gender_match = re.search(r"(male|female|transgender)", text, re.IGNORECASE)

        return {
            "doc_type": "aadhaar",
            "name": name_match.group(1).strip() if name_match else "Unknown",
            "aadhaar_number": f"XXXX-XXXX-{aadhaar_match.group(1)[-4:]}" if aadhaar_match else "XXXX-XXXX-XXXX",
            "address": "Extracted from document",
            "dob": dob_match.group(1) if dob_match else "Unknown",
            "gender": gender_match.group(1).capitalize() if gender_match else "Unknown",
            "confidence": confidence,
        }

    def _extract_pan(self, text: str, confidence: float) -> dict:
        """Extract PAN card fields from OCR text."""
        pan_match = re.search(r"([A-Z]{5}\d{4}[A-Z])", text)
        name_match = re.search(r"(?:name|नाम)[:\s]*([A-Za-z\s]+)", text, re.IGNORECASE)
        dob_match = re.search(r"(\d{2}[/-]\d{2}[/-]\d{4})", text)

        return {
            "doc_type": "pan",
            "name": name_match.group(1).strip() if name_match else "Unknown",
            "pan_number": pan_match.group(1) if pan_match else "Unknown",
            "father_name": "Extracted from document",
            "dob": dob_match.group(1) if dob_match else "Unknown",
            "confidence": confidence,
        }

    def _extract_bank_statement(self, text: str, confidence: float) -> dict:
        """Extract bank statement fields from OCR text."""
        account_match = re.search(r"(?:account|a/c)[:\s#]*(\d+)", text, re.IGNORECASE)
        balance_match = re.search(r"(?:balance|bal)[:\s]*[\₹Rs.]*\s*([\d,]+)", text, re.IGNORECASE)

        return {
            "doc_type": "bank_statement",
            "name": "Extracted from document",
            "account_number": f"XXXX{account_match.group(1)[-4:]}" if account_match else "Unknown",
            "bank": "Extracted from document",
            "avg_monthly_balance": int(balance_match.group(1).replace(",", "")) if balance_match else 0,
            "monthly_income": 0,
            "monthly_expenses": 0,
            "loan_emis_existing": 0,
            "confidence": confidence,
        }

    def _extract_gst(self, text: str, confidence: float) -> dict:
        """Extract GST certificate fields from OCR text."""
        gst_match = re.search(r"(\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z])", text)
        turnover_match = re.search(r"(?:turnover|revenue)[:\s]*[\₹Rs.]*\s*([\d,]+)", text, re.IGNORECASE)

        return {
            "doc_type": "gst",
            "gst_number": gst_match.group(1) if gst_match else "Unknown",
            "business_name": "Extracted from document",
            "annual_turnover": int(turnover_match.group(1).replace(",", "")) if turnover_match else 0,
            "filing_status": "unknown",
            "confidence": confidence,
        }
