from __future__ import annotations

from typing import Any


def check_vital_signs_escalation(vitals: dict[str, Any]) -> dict[str, Any]:
    """Check if vital signs require escalation."""
    alerts = []

    systolic = vitals.get("systolic_bp")
    if systolic and systolic > 180:
        alerts.append({
            "severity": "high",
            "parameter": "systolic_bp",
            "value": systolic,
            "message": "Severe hypertension - contact GP immediately",
            "action": "Contact GP within 1 hour",
        })
    elif systolic and systolic < 90:
        alerts.append({
            "severity": "high",
            "parameter": "systolic_bp",
            "value": systolic,
            "message": "Hypotension - assess for shock",
            "action": "Contact GP within 1 hour",
        })

    spo2 = vitals.get("spo2_percent")
    if spo2 and spo2 < 92:
        alerts.append({
            "severity": "high",
            "parameter": "spo2",
            "value": spo2,
            "message": "Low oxygen saturation",
            "action": "Contact GP immediately, consider 999",
        })

    temp = vitals.get("temperature_celsius")
    if temp and temp > 38.5:
        alerts.append({
            "severity": "medium",
            "parameter": "temperature",
            "value": temp,
            "message": "Fever - monitor for infection",
            "action": "Increase observations, contact GP if persists",
        })
    elif temp and temp < 35.0:
        alerts.append({
            "severity": "high",
            "parameter": "temperature",
            "value": temp,
            "message": "Hypothermia",
            "action": "Warm patient, contact GP immediately",
        })

    consciousness = vitals.get("consciousness_level")
    if consciousness and consciousness in ["P", "U"]:
        alerts.append({
            "severity": "critical",
            "parameter": "consciousness",
            "value": consciousness,
            "message": "Reduced consciousness - possible neurological emergency",
            "action": "Call 999 immediately",
        })

    return {
        "alerts": alerts,
        "escalation_required": any(a["severity"] in ["high", "critical"] for a in alerts),
        "highest_severity": max(
            [a["severity"] for a in alerts],
            key=lambda s: {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(s, 0),
        ) if alerts else None,
    }


def check_fluid_balance_alert(
    cumulative_intake: int,
    cumulative_output: int,
    target_intake: int,
) -> dict[str, Any]:
    """Check if fluid balance requires alert."""
    net_balance = cumulative_intake - cumulative_output
    deviation = cumulative_intake - target_intake
    deviation_percent = (deviation / target_intake * 100) if target_intake > 0 else 0

    alert = None
    if deviation_percent < -20:
        alert = {
            "severity": "medium",
            "type": "low_intake",
            "message": f"Fluid intake {abs(deviation_percent):.0f}% below target",
            "action": "Encourage fluids, monitor closely",
        }
    elif deviation_percent > 30:
        alert = {
            "severity": "medium",
            "type": "high_intake",
            "message": f"Fluid intake {deviation_percent:.0f}% above target",
            "action": "Monitor for fluid overload, contact GP if concerned",
        }

    return {
        "alert": alert,
        "cumulative_intake": cumulative_intake,
        "cumulative_output": cumulative_output,
        "net_balance": net_balance,
        "target_intake": target_intake,
        "deviation_percent": deviation_percent,
    }


def check_wound_infection_signs(wound_data: dict[str, Any]) -> dict[str, Any]:
    """Check wound assessment for infection signs."""
    infection_indicators = []

    if wound_data.get("odour") and wound_data["odour"] != "none":
        infection_indicators.append("unusual_odour")
    if wound_data.get("exudate_type") and "purulent" in str(wound_data["exudate_type"]).lower():
        infection_indicators.append("purulent_exudate")
    if wound_data.get("periwound_skin") and "erythema" in str(wound_data["periwound_skin"]).lower():
        infection_indicators.append("periwound_erythema")
    if wound_data.get("pain_score") and wound_data["pain_score"] > 7:
        infection_indicators.append("severe_pain")

    return {
        "infection_suspected": len(infection_indicators) >= 2,
        "indicators": infection_indicators,
        "recommendation": (
            "Consider wound swab and GP review for possible infection"
            if len(infection_indicators) >= 2
            else "Continue current wound care"
        ),
    }
