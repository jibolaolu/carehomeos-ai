from app.services.ai.falls_risk_scorer import score_falls_risk


def run() -> dict[str, object]:
    return score_falls_risk({"falls_last_90_days": 1, "mobility": "Frame", "confusion": True})
