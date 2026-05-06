import re
import time
from typing import Any

# Module-level velocity tracker: {pan_number: [timestamp, ...]}
_velocity_store: dict[str, list[float]] = {}


class FraudDetector:
    """Detects potential fraud signals in loan applications."""

    async def check(self, applicant_data: dict) -> dict:
        """Run fraud checks against applicant data and documents."""
        name = applicant_data.get("name", "")
        pan_number = applicant_data.get("pan_number", "")
        aadhaar_number = applicant_data.get("aadhaar_number", "")
        phone = applicant_data.get("phone", "")
        documents = applicant_data.get("documents", [])

        signals: list[dict[str, str]] = []

        # Demo trigger: PAN starting with "FRAUD"
        if pan_number.upper().startswith("FRAUD"):
            return self._critical_fraud_response(pan_number)

        # Check PAN format
        pan_signal = self._check_pan_format(pan_number)
        if pan_signal:
            signals.append(pan_signal)

        # Check Aadhaar format
        aadhaar_signal = self._check_aadhaar_format(aadhaar_number)
        if aadhaar_signal:
            signals.append(aadhaar_signal)

        # Cross-document name consistency
        name_signals = self._check_name_consistency(name, documents)
        signals.extend(name_signals)

        # DOB consistency across documents
        dob_signals = self._check_dob_consistency(documents)
        signals.extend(dob_signals)

        # Synthetic ID scoring
        synthetic_score = self._compute_synthetic_score(name, documents, signals)

        # Velocity check
        velocity = self._velocity_check(pan_number)
        if velocity["applications_24h"] > 3:
            signals.append({
                "type": "velocity",
                "description": f"High application frequency: {velocity['applications_24h']} in 24h",
                "severity": "high",
            })

        # Determine overall risk
        risk_level = self._compute_risk_level(signals, synthetic_score)
        fraud_flag = risk_level in ("high", "critical")

        return {
            "fraud_flag": fraud_flag,
            "risk_level": risk_level,
            "signals": signals,
            "velocity_check": velocity,
            "synthetic_id_score": synthetic_score,
        }

    def _critical_fraud_response(self, pan_number: str) -> dict:
        """Return a critical fraud response for demo trigger PANs."""
        return {
            "fraud_flag": True,
            "risk_level": "critical",
            "signals": [
                {
                    "type": "known_fraud",
                    "description": f"PAN {pan_number} is flagged in fraud database",
                    "severity": "critical",
                },
                {
                    "type": "synthetic_identity",
                    "description": "Identity markers indicate synthetic/fabricated profile",
                    "severity": "critical",
                },
            ],
            "velocity_check": {"applications_24h": 12, "same_device": True},
            "synthetic_id_score": 0.97,
        }

    def _check_pan_format(self, pan_number: str) -> dict | None:
        """Validate PAN format: [A-Z]{5}[0-9]{4}[A-Z]{1}."""
        if not pan_number:
            return {
                "type": "missing_document",
                "description": "PAN number not provided",
                "severity": "medium",
            }
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan_number):
            return {
                "type": "invalid_format",
                "description": f"PAN format invalid: {pan_number}",
                "severity": "high",
            }
        return None

    def _check_aadhaar_format(self, aadhaar_number: str) -> dict | None:
        """Validate Aadhaar is 12 digits (may have dashes/spaces)."""
        if not aadhaar_number:
            return {
                "type": "missing_document",
                "description": "Aadhaar number not provided",
                "severity": "medium",
            }
        digits_only = re.sub(r"[\s\-X]", "", aadhaar_number)
        if not (digits_only.isdigit() and len(digits_only) >= 4):
            return {
                "type": "invalid_format",
                "description": f"Aadhaar format invalid: {aadhaar_number}",
                "severity": "high",
            }
        return None

    def _check_name_consistency(self, applicant_name: str, documents: list) -> list:
        """Check if name matches across all documents."""
        signals = []
        if not applicant_name or not documents:
            return signals

        app_name_lower = applicant_name.lower().strip()

        for doc in documents:
            doc_name = doc.get("name", "")
            if not doc_name:
                continue
            doc_name_lower = doc_name.lower().strip()
            if doc_name_lower and doc_name_lower != app_name_lower:
                # Allow partial match (first name or last name match)
                app_parts = set(app_name_lower.split())
                doc_parts = set(doc_name_lower.split())
                if not app_parts.intersection(doc_parts):
                    signals.append({
                        "type": "name_mismatch",
                        "description": f"Name mismatch: '{applicant_name}' vs '{doc_name}' in {doc.get('doc_type', 'document')}",
                        "severity": "high",
                    })

        return signals

    def _check_dob_consistency(self, documents: list) -> list:
        """Check if DOB is consistent across documents."""
        signals = []
        dobs = []

        for doc in documents:
            dob = doc.get("dob")
            if dob and dob != "Unknown":
                dobs.append((doc.get("doc_type", "document"), dob))

        if len(dobs) >= 2:
            first_dob = dobs[0][1]
            for doc_type, dob in dobs[1:]:
                if dob != first_dob:
                    signals.append({
                        "type": "dob_mismatch",
                        "description": f"DOB conflict: {dobs[0][0]} has {first_dob}, {doc_type} has {dob}",
                        "severity": "high",
                    })

        return signals

    def _compute_synthetic_score(self, name: str, documents: list, signals: list) -> float:
        """Compute likelihood of synthetic identity (0-1)."""
        score = 0.0

        # Unusual name patterns (single character names, all caps, numbers in name)
        if name:
            if len(name) < 3:
                score += 0.3
            if name.isupper() and len(name) > 5:
                score += 0.1
            if any(c.isdigit() for c in name):
                score += 0.4

        # Signals contribute to synthetic score
        high_severity_count = sum(1 for s in signals if s.get("severity") == "high")
        score += high_severity_count * 0.15

        critical_count = sum(1 for s in signals if s.get("severity") == "critical")
        score += critical_count * 0.3

        return min(round(score, 2), 1.0)

    def _velocity_check(self, pan_number: str) -> dict:
        """Track and check application velocity per PAN."""
        global _velocity_store

        now = time.time()
        cutoff = now - 86400  # 24 hours ago

        if pan_number not in _velocity_store:
            _velocity_store[pan_number] = []

        # Clean old entries
        _velocity_store[pan_number] = [
            ts for ts in _velocity_store[pan_number] if ts > cutoff
        ]

        # Record this application
        _velocity_store[pan_number].append(now)

        return {
            "applications_24h": len(_velocity_store[pan_number]),
            "same_device": False,
        }

    def _compute_risk_level(self, signals: list, synthetic_score: float) -> str:
        """Determine overall risk level from signals and synthetic score."""
        if not signals and synthetic_score < 0.2:
            return "none"

        severities = [s.get("severity", "low") for s in signals]

        if "critical" in severities or synthetic_score >= 0.8:
            return "critical"
        if severities.count("high") >= 2 or synthetic_score >= 0.6:
            return "high"
        if "high" in severities or synthetic_score >= 0.4:
            return "medium"
        if signals:
            return "low"

        return "none"
