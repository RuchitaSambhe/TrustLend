"""
TrustLend Bedrock LLM Integration - Uses Strands Agents with Claude for explainability.

Falls back to mock response if AWS is unavailable or MOCK_MODE is True.
"""

import json
import logging

from config import settings

logger = logging.getLogger(__name__)


def get_trust_score_reasoning(signals: dict) -> dict:
    """
    Call Bedrock Claude via Strands Agent to get trust score reasoning.

    Returns: {"adjustment": int, "reasoning": str, "risk_factors": list}
    """
    if settings.MOCK_MODE:
        return _mock_reasoning(signals)

    try:
        from strands import Agent
        from strands.models import BedrockModel

        model = BedrockModel(
            model_id=settings.BEDROCK_MODEL_ID,
            region_name=settings.AWS_REGION,
            max_tokens=1024,
            temperature=0.7,
        )

        agent = Agent(model=model)

        prompt = (
            "You are a loan underwriting AI. Given these signals: "
            f"{json.dumps(signals)}. "
            "Provide: 1) A trust score adjustment between -10 and +10, "
            "2) A 2-sentence reasoning explaining the adjustment, "
            "3) A list of risk factors. "
            "Respond ONLY in JSON format: "
            '{"adjustment": <int>, "reasoning": "<string>", "risk_factors": ["<string>", ...]}'
        )

        response = agent(prompt)
        response_text = str(response)

        # Try to parse JSON from response
        json_start = response_text.find("{")
        json_end = response_text.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(response_text[json_start:json_end])
            return {
                "adjustment": max(-10, min(10, int(parsed.get("adjustment", 0)))),
                "reasoning": str(parsed.get("reasoning", "")),
                "risk_factors": list(parsed.get("risk_factors", [])),
            }

        # If parsing fails, return mock
        logger.warning("Failed to parse Bedrock response, using mock")
        return _mock_reasoning(signals)

    except Exception as e:
        logger.warning(f"Bedrock LLM call failed: {e}. Falling back to mock.")
        return _mock_reasoning(signals)


def _mock_reasoning(signals: dict) -> dict:
    """Deterministic mock reasoning based on signals."""
    credit_norm = signals.get("credit_normalized", 50)
    income_norm = signals.get("income_normalized", 50)
    fraud_norm = signals.get("fraud_normalized", 100)

    adjustment = 0
    reasons = []
    risk_factors = []

    if credit_norm > 75 and income_norm < 40:
        adjustment -= 5
        reasons.append(
            f"Strong credit history but income adequacy is low relative to the requested loan amount."
        )
        risk_factors.append("Low income-to-EMI ratio")
    elif credit_norm < 50 and income_norm > 75:
        adjustment += 5
        reasons.append(
            "Credit score is below average, but strong income indicates capacity to service the loan."
        )
        risk_factors.append("Below-average credit score")

    if credit_norm > 70 and fraud_norm > 80 and income_norm > 60:
        adjustment += 3
        reasons.append("All verification signals are consistent and strong.")

    if fraud_norm < 70:
        adjustment -= 5
        reasons.append("Fraud detection signals present. Additional verification recommended.")
        risk_factors.append("Elevated fraud risk indicators")

    adjustment = max(-10, min(10, adjustment))

    if not reasons:
        reasons.append(
            "Standard risk assessment applies. No significant edge cases detected."
        )

    return {
        "adjustment": adjustment,
        "reasoning": " ".join(reasons[:2]),
        "risk_factors": risk_factors if risk_factors else ["None identified"],
    }
