from __future__ import annotations


def score_falls_risk(profile: dict[str, object]) -> dict[str, object]:
    score = 15
    factors: list[str] = []

    if int(profile.get("falls_last_90_days", 0)) > 0:
        score += 30
        factors.append("Recent fall history")
    if str(profile.get("mobility", "")).lower().find("frame") >= 0:
        score += 15
        factors.append("Walking aid required")
    if bool(profile.get("confusion")):
        score += 20
        factors.append("Confusion or delirium risk")
    if int(profile.get("medication_count", 0)) >= 8:
        score += 10
        factors.append("Polypharmacy")
    if bool(profile.get("night_wandering")):
        score += 15
        factors.append("Night-time wandering")

    risk = "high" if score >= 70 else "medium" if score >= 40 else "low"
    return {"score": min(score, 100), "risk": risk, "factors": factors or ["No elevated falls factors recorded"]}
