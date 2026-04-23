from app.services.ai.falls_risk_scorer import score_falls_risk


def calculate_daily_score(resident_id: str, profile: dict[str, object]) -> dict[str, object]:
    return {"resident_id": resident_id, **score_falls_risk(profile)}
