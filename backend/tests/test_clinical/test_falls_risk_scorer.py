from app.services.ai.falls_risk_scorer import score_falls_risk


def test_high_risk_score_uses_multiple_factors():
    result = score_falls_risk(
        {
            "falls_last_90_days": 2,
            "mobility": "Frame with one-carer support",
            "confusion": True,
            "medication_count": 9,
            "night_wandering": True,
        }
    )

    assert result["risk"] == "high"
    assert result["score"] == 100
    assert "Recent fall history" in result["factors"]


def test_low_risk_when_no_factors_recorded():
    result = score_falls_risk({"falls_last_90_days": 0})

    assert result["risk"] == "low"
