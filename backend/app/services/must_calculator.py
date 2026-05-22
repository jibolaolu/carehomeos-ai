from __future__ import annotations

from typing import Any


def calculate_must(data: dict[str, Any]) -> dict[str, Any]:
    """Calculate MUST (Malnutrition Universal Screening Tool) score.

    MUST scoring:
    - BMI score (0-2 points)
    - Unplanned weight loss score (0-2 points)
    - Acute disease effect score (0-2 points)

    Total: 0-6
    """
    score = 0
    breakdown = {}

    # BMI score
    bmi = data.get("bmi")
    if bmi is not None:
        try:
            bmi_val = float(bmi)
            if bmi_val < 18.5:
                breakdown["bmi"] = 2
            elif bmi_val < 20.0:
                breakdown["bmi"] = 1
            else:
                breakdown["bmi"] = 0
        except (ValueError, TypeError):
            breakdown["bmi"] = 0
    else:
        # Calculate BMI from weight and height
        weight = data.get("weight_kg")
        height = data.get("height_cm")
        if weight and height:
            try:
                bmi_val = float(weight) / ((float(height) / 100) ** 2)
                if bmi_val < 18.5:
                    breakdown["bmi"] = 2
                elif bmi_val < 20.0:
                    breakdown["bmi"] = 1
                else:
                    breakdown["bmi"] = 0
            except (ValueError, TypeError, ZeroDivisionError):
                breakdown["bmi"] = 0
        else:
            breakdown["bmi"] = 0

    score += breakdown["bmi"]

    # Unplanned weight loss score
    loss_percent = data.get("unplanned_weight_loss_percent")
    if loss_percent is not None:
        try:
            loss_val = float(loss_percent)
            if loss_val >= 10:
                breakdown["weight_loss"] = 2
            elif loss_val >= 5:
                breakdown["weight_loss"] = 1
            else:
                breakdown["weight_loss"] = 0
        except (ValueError, TypeError):
            breakdown["weight_loss"] = 0
    else:
        breakdown["weight_loss"] = 0

    score += breakdown["weight_loss"]

    # Acute disease effect
    acute_disease = data.get("acute_disease_effect", False)
    if acute_disease:
        breakdown["acute_disease"] = 2
    else:
        breakdown["acute_disease"] = 0

    score += breakdown["acute_disease"]

    # Risk category
    if score == 0:
        risk_category = "Low risk"
        malnutrition_risk = False
        action = "Routine clinical care"
    elif score == 1:
        risk_category = "Medium risk"
        malnutrition_risk = True
        action = "Observe, document food intake for 3 days"
    else:
        risk_category = "High risk"
        malnutrition_risk = True
        action = "Treat, refer to dietitian, set goals, improve intake"

    return {
        "score": score,
        "breakdown": breakdown,
        "risk_category": risk_category,
        "malnutrition_risk": malnutrition_risk,
        "action": action,
        "max_score": 6,
    }
