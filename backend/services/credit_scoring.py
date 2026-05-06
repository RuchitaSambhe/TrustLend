import hashlib

from config import settings


class CreditScorer:
    """Fetches or mocks credit bureau scores based on PAN number."""

    async def get_score(self, pan_number: str, name: str) -> dict:
        """Return a credit score report for the given PAN holder."""
        if settings.MOCK_MODE:
            return self._mock_score(pan_number, name)
        # Real mode would call a credit bureau API here
        return self._mock_score(pan_number, name)

    def _mock_score(self, pan_number: str, name: str) -> dict:
        """Generate deterministic mock credit data based on PAN."""
        pan_hash = int(hashlib.sha256(pan_number.encode()).hexdigest(), 16)

        # Use the last digit in the PAN (4th digit at index 8 in valid PAN format)
        # Valid PAN: [A-Z]{5}[0-9]{4}[A-Z] — digits are at positions 5-8
        last_digit = None
        for ch in reversed(pan_number):
            if ch.isdigit():
                last_digit = int(ch)
                break
        if last_digit is None:
            last_digit = pan_hash % 10

        if last_digit > 7:
            # Good: 750-850
            score = 750 + (pan_hash % 101)
        elif last_digit >= 4:
            # Medium: 650-749
            score = 650 + (pan_hash % 100)
        else:
            # Poor: 550-649
            score = 550 + (pan_hash % 100)

        # Derive other fields logically from score
        credit_age = self._derive_credit_age(score, pan_hash)
        total_accounts = self._derive_total_accounts(score, pan_hash)
        active_loans = self._derive_active_loans(score, pan_hash)
        defaults = self._derive_defaults(score, pan_hash)
        payment_history = self._derive_payment_history(score, pan_hash)
        utilization = self._derive_utilization(score, pan_hash)
        enquiries = self._derive_enquiries(score, pan_hash)
        risk_category = self._derive_risk_category(score)

        return {
            "credit_score": score,
            "credit_age_years": credit_age,
            "total_accounts": total_accounts,
            "active_loans": active_loans,
            "defaults_last_3_years": defaults,
            "payment_history_percent": payment_history,
            "credit_utilization_percent": utilization,
            "enquiries_last_6_months": enquiries,
            "risk_category": risk_category,
        }

    def _derive_credit_age(self, score: int, h: int) -> int:
        """Higher scores correlate with longer credit history."""
        if score >= 750:
            return 5 + (h % 11)  # 5-15 years
        elif score >= 650:
            return 3 + (h % 7)   # 3-9 years
        else:
            return 1 + (h % 4)   # 1-4 years

    def _derive_total_accounts(self, score: int, h: int) -> int:
        """Higher scores tend to have more accounts."""
        if score >= 750:
            return 5 + (h % 8)   # 5-12
        elif score >= 650:
            return 3 + (h % 6)   # 3-8
        else:
            return 1 + (h % 4)   # 1-4

    def _derive_active_loans(self, score: int, h: int) -> int:
        """Moderate active loans for good scores, fewer or more for others."""
        if score >= 750:
            return 1 + (h % 3)   # 1-3
        elif score >= 650:
            return 2 + (h % 3)   # 2-4
        else:
            return 1 + (h % 5)   # 1-5

    def _derive_defaults(self, score: int, h: int) -> int:
        """Lower scores have more defaults."""
        if score >= 750:
            return 0
        elif score >= 650:
            return h % 2         # 0-1
        else:
            return 1 + (h % 3)   # 1-3

    def _derive_payment_history(self, score: int, h: int) -> float:
        """Higher scores have better payment history."""
        if score >= 750:
            return round(95.0 + (h % 50) / 10.0, 1)   # 95.0-99.9
        elif score >= 650:
            return round(80.0 + (h % 150) / 10.0, 1)  # 80.0-94.9
        else:
            return round(55.0 + (h % 250) / 10.0, 1)  # 55.0-79.9

    def _derive_utilization(self, score: int, h: int) -> float:
        """Lower utilization is better (correlates with higher score)."""
        if score >= 750:
            return round(10.0 + (h % 200) / 10.0, 1)  # 10.0-29.9
        elif score >= 650:
            return round(30.0 + (h % 250) / 10.0, 1)  # 30.0-54.9
        else:
            return round(55.0 + (h % 350) / 10.0, 1)  # 55.0-89.9

    def _derive_enquiries(self, score: int, h: int) -> int:
        """More enquiries correlate with lower scores."""
        if score >= 750:
            return h % 3         # 0-2
        elif score >= 650:
            return 1 + (h % 4)   # 1-4
        else:
            return 3 + (h % 5)   # 3-7

    def _derive_risk_category(self, score: int) -> str:
        """Map score to risk category."""
        if score >= 750:
            return "low"
        elif score >= 650:
            return "medium"
        else:
            return "high"
