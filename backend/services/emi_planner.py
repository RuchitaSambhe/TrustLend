"""
TrustLend EMI Planner - Generates repayment plans based on trust score and income.
"""


class EMIPlanner:
    """Generates EMI repayment plans adjusted by trust score."""

    BASE_RATE = 10.5  # Annual percentage
    MIN_RATE = 7.5
    MAX_RATE = 18.0

    PLANS = [
        {"plan_name": "Conservative", "tenure_months": 60},
        {"plan_name": "Balanced", "tenure_months": 36},
        {"plan_name": "Aggressive", "tenure_months": 24},
    ]

    async def generate_plans(
        self, loan_amount: float, trust_score: int, monthly_income: float
    ) -> list[dict]:
        """Generate 3 EMI plans with trust-score-adjusted interest rates."""
        # Calculate interest rate based on trust score
        rate_adjustment = (trust_score - 50) * 0.03
        annual_rate = self.BASE_RATE - rate_adjustment
        annual_rate = max(self.MIN_RATE, min(self.MAX_RATE, annual_rate))
        annual_rate = round(annual_rate, 2)

        plans = []
        for plan_template in self.PLANS:
            plan = self._calculate_plan(
                loan_amount=loan_amount,
                annual_rate=annual_rate,
                tenure_months=plan_template["tenure_months"],
                plan_name=plan_template["plan_name"],
                monthly_income=monthly_income,
            )
            plans.append(plan)

        return plans

    def _calculate_plan(
        self,
        loan_amount: float,
        annual_rate: float,
        tenure_months: int,
        plan_name: str,
        monthly_income: float,
    ) -> dict:
        """Calculate a single EMI plan with all financial details."""
        monthly_rate = annual_rate / 12 / 100  # Convert to monthly decimal

        # EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        if monthly_rate == 0:
            emi = loan_amount / tenure_months
        else:
            power = (1 + monthly_rate) ** tenure_months
            emi = loan_amount * monthly_rate * power / (power - 1)

        monthly_emi = round(emi)
        total_payable = monthly_emi * tenure_months
        total_interest = total_payable - loan_amount

        # EMI to income ratio
        emi_to_income = (monthly_emi / monthly_income * 100) if monthly_income > 0 else 100.0

        # Recommendation based on EMI-to-income ratio
        recommendation = self._get_recommendation(emi_to_income)

        return {
            "plan_name": plan_name,
            "tenure_months": tenure_months,
            "interest_rate_annual": annual_rate,
            "monthly_emi": monthly_emi,
            "total_interest": round(total_interest, 2),
            "total_payable": round(total_payable, 2),
            "emi_to_income_ratio": round(emi_to_income, 2),
            "recommendation": recommendation,
        }

    def _get_recommendation(self, emi_to_income: float) -> str:
        """Classify plan based on EMI-to-income ratio."""
        if emi_to_income < 30:
            return "Comfortable"
        elif emi_to_income <= 40:
            return "Recommended"
        else:
            return "Stretching"
