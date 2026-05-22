from __future__ import annotations

from typing import Any


def calculate_news2(vitals: dict[str, Any]) -> dict[str, Any]:
    """Calculate NEWS2 (National Early Warning Score 2).

    NEWS2 scoring:
    - Respiration rate (0-3 points)
    - SpO2 (0-3 points) - scale 1 or 2
    - Air/Oxygen (0-2 points)
    - Systolic BP (0-3 points)
    - Pulse (0-3 points)
    - Consciousness (0-3 points)
    - Temperature (0-3 points)

    Total: 0-20
    """
    score = 0
    breakdown = {}

    # Respiration rate
    resp = vitals.get("respiration_rate")
    if resp is not None:
        if resp <= 8:
            breakdown["respiration"] = 3
        elif resp <= 11:
            breakdown["respiration"] = 1
        elif resp <= 20:
            breakdown["respiration"] = 0
        elif resp <= 24:
            breakdown["respiration"] = 2
        else:
            breakdown["respiration"] = 3
        score += breakdown["respiration"]

    # SpO2 (Scale 1 - no hypercapnic respiratory failure)
    spo2 = vitals.get("spo2_percent")
    if spo2 is not None:
        if spo2 <= 91:
            breakdown["spo2"] = 3
        elif spo2 <= 93:
            breakdown["spo2"] = 2
        elif spo2 <= 95:
            breakdown["spo2"] = 1
        else:
            breakdown["spo2"] = 0
        score += breakdown["spo2"]

    # Air / Oxygen
    on_o2 = vitals.get("spo2_on_o2", False)
    o2_flow = vitals.get("o2_flow_rate", 0)
    if on_o2 and o2_flow and o2_flow > 0:
        breakdown["air_oxygen"] = 2
    else:
        breakdown["air_oxygen"] = 0
    score += breakdown["air_oxygen"]

    # Systolic BP
    systolic = vitals.get("systolic_bp")
    if systolic is not None:
        if systolic <= 90:
            breakdown["systolic_bp"] = 3
        elif systolic <= 100:
            breakdown["systolic_bp"] = 2
        elif systolic <= 110:
            breakdown["systolic_bp"] = 1
        elif systolic <= 219:
            breakdown["systolic_bp"] = 0
        else:
            breakdown["systolic_bp"] = 3
        score += breakdown["systolic_bp"]

    # Pulse
    pulse = vitals.get("pulse_rate")
    if pulse is not None:
        if pulse <= 40:
            breakdown["pulse"] = 3
        elif pulse <= 50:
            breakdown["pulse"] = 1
        elif pulse <= 90:
            breakdown["pulse"] = 0
        elif pulse <= 110:
            breakdown["pulse"] = 1
        elif pulse <= 130:
            breakdown["pulse"] = 2
        else:
            breakdown["pulse"] = 3
        score += breakdown["pulse"]

    # Consciousness
    consciousness = vitals.get("consciousness_level", "A")
    consciousness_map = {"A": 0, "V": 3, "P": 3, "U": 3}
    breakdown["consciousness"] = consciousness_map.get(consciousness, 0)
    score += breakdown["consciousness"]

    # Temperature
    temp = vitals.get("temperature_celsius")
    if temp is not None:
        try:
            temp_val = float(temp)
            if temp_val <= 35.0:
                breakdown["temperature"] = 3
            elif temp_val <= 36.0:
                breakdown["temperature"] = 1
            elif temp_val <= 38.0:
                breakdown["temperature"] = 0
            elif temp_val <= 39.0:
                breakdown["temperature"] = 1
            else:
                breakdown["temperature"] = 2
            score += breakdown["temperature"]
        except (ValueError, TypeError):
            breakdown["temperature"] = 0

    # Risk category and escalation
    if score <= 4:
        risk_category = "Low"
        escalation_required = False
        escalation_action = "Continue routine monitoring"
    elif score <= 6:
        risk_category = "Low-medium"
        escalation_required = True
        escalation_action = "Inform registered nurse immediately"
    else:
        risk_category = "High"
        escalation_required = True
        escalation_action = "Urgent response required - contact GP or emergency services"

    return {
        "score": score,
        "breakdown": breakdown,
        "risk_category": risk_category,
        "escalation_required": escalation_required,
        "escalation_action": escalation_action,
        "max_score": 20,
    }
