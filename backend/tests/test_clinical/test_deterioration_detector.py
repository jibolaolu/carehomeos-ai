from app.services.ai.deterioration_detector import detect_deterioration


def test_high_deterioration_signal_triggers_urgent_actions():
    result = detect_deterioration(["Resident is short of breath with acute confusion."])

    assert result["alert_level"] == "high"
    assert result["score"] >= 0.9
    assert "Immediate nurse review" in result["actions"]


def test_multiple_medium_signals_trigger_medium_alert():
    result = detect_deterioration(["Resident not eating and has reduced fluids after a fall."])

    assert result["alert_level"] == "medium"
    assert len(result["signals"]) >= 2
