"""
Predictive Analytics Service
============================
Provides forward-looking risk predictions and trend analysis
using time-series data and LLM-powered insights.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_router import TaskType, complete

logger = logging.getLogger(__name__)


PREDICTIVE_SYSTEM_PROMPT = """You are a UK care home clinical data analyst specialising in predictive risk modelling.
Analyse historical trends to predict future risks. Be specific about confidence levels and limitations.
Always note that predictions are probabilistic, not deterministic."""


async def predict_deterioration_risk(
    resident: dict[str, Any],
    historical_scores: list[dict[str, Any]],
    days_forward: int = 7,
) -> dict[str, Any]:
    """Predict deterioration risk for the next 7 days based on historical trends.
    
    Args:
        resident: Resident profile
        historical_scores: List of past deterioration scores with dates
        days_forward: Number of days to predict forward
    
    Returns:
        Risk prediction with confidence intervals
    """
    if not historical_scores or len(historical_scores) < 3:
        return {
            "predicted_risk_score": 0,
            "confidence": 0.3,
            "trend": "insufficient_data",
            "prediction": "Insufficient historical data for reliable prediction",
            "recommended_actions": ["Continue monitoring", "Build more data points"],
        }
    
    # Build trend summary
    trend_summary = "\n".join([
        f"- [{s.get('date', 'unknown')}] Risk score: {s.get('score', 0)}, Alert: {s.get('alert_level', 'none')}, Pattern: {s.get('pattern', 'none')}"
        for s in historical_scores[-14:]  # Last 14 data points
    ])
    
    prompt = f"""Predict deterioration risk for {resident.get('name', 'this resident')} over the next {days_forward} days.

Resident: {resident.get('name', 'unknown')}, Age: {resident.get('age', 'unknown')}, Primary need: {resident.get('primary_need', 'unknown')}

Historical Deterioration Scores (last 14 data points):
{trend_summary}

Respond with JSON:
{{
    "predicted_risk_score": 0-10,
    "confidence": 0.0-1.0,
    "trend": "improving" | "stable" | "deteriorating" | "rapidly_deteriorating",
    "prediction": "specific prediction text",
    "risk_factors": ["factors contributing to prediction"],
    "protective_factors": ["factors that may reduce risk"],
    "recommended_actions": ["specific actions to take"],
    "monitoring_frequency": "daily" | "twice_daily" | "continuous",
    "escalation_threshold": "what score would trigger escalation"
}}

Base prediction on trend analysis, not just current score.
If trend is worsening, predict higher risk even if current score is moderate.
If trend is improving, predict lower risk even if current score is elevated."""

    result = await complete(
        task_type=TaskType.DETERIORATION,
        prompt=prompt,
        system=PREDICTIVE_SYSTEM_PROMPT,
    )
    
    prediction = _parse_json_safely(result.text)
    
    if prediction.get("parse_error"):
        # Simple trend-based fallback
        scores = [s.get("score", 0) for s in historical_scores[-7:]]
        avg_score = sum(scores) / len(scores) if scores else 0
        trend = "improving" if scores and scores[-1] < scores[0] else "deteriorating" if scores and scores[-1] > scores[0] else "stable"
        
        prediction = {
            "predicted_risk_score": min(avg_score + 1, 10) if trend == "deteriorating" else max(avg_score - 1, 0),
            "confidence": 0.5,
            "trend": trend,
            "prediction": f"Based on {len(scores)} data points, trend is {trend}.",
            "risk_factors": ["Historical trend analysis"],
            "protective_factors": ["Regular monitoring"],
            "recommended_actions": ["Continue current monitoring", "Review if trend changes"],
            "monitoring_frequency": "daily",
            "escalation_threshold": "Score >= 7 or rapid increase",
            "_fallback": True,
        }
    
    prediction["resident_id"] = resident.get("id")
    prediction["prediction_date"] = datetime.now(timezone.utc).isoformat()
    prediction["prediction_horizon_days"] = days_forward
    prediction["ai_provider"] = result.provider
    prediction["ai_model"] = result.model
    
    return prediction


async def predict_falls_risk(
    resident: dict[str, Any],
    historical_scores: list[dict[str, Any]],
    days_forward: int = 7,
) -> dict[str, Any]:
    """Predict falls risk for the next 7 days."""
    if not historical_scores or len(historical_scores) < 3:
        return {
            "predicted_risk_score": 0,
            "confidence": 0.3,
            "trend": "insufficient_data",
            "prediction": "Insufficient historical data",
        }
    
    scores = [s.get("score", 0) for s in historical_scores[-7:]]
    avg_score = sum(scores) / len(scores) if scores else 0
    trend = "improving" if scores and scores[-1] < scores[0] else "deteriorating" if scores and scores[-1] > scores[0] else "stable"
    
    # Simple prediction based on trend
    predicted = min(avg_score + 5, 100) if trend == "deteriorating" else max(avg_score - 5, 0) if trend == "improving" else avg_score
    
    return {
        "predicted_risk_score": predicted,
        "confidence": 0.5,
        "trend": trend,
        "prediction": f"Falls risk trend is {trend}. Predicted score: {predicted}/100.",
        "recommended_actions": [
            "Continue falls prevention measures" if trend != "deteriorating" else "Review and intensify falls prevention",
            "Ensure walking aids are within reach",
        ],
        "monitoring_frequency": "daily" if predicted >= 50 else "weekly",
        "escalation_threshold": "Score >= 75 or any fall event",
        "resident_id": resident.get("id"),
        "prediction_date": datetime.now(timezone.utc).isoformat(),
    }


async def predict_bed_occupancy(
    home_id: str,
    historical_occupancy: list[dict[str, Any]],
    days_forward: int = 30,
) -> dict[str, Any]:
    """Predict bed occupancy for capacity planning.
    
    Args:
        home_id: Care home ID
        historical_occupancy: Daily occupancy data
        days_forward: Prediction horizon
    
    Returns:
        Occupancy forecast with confidence intervals
    """
    if not historical_occupancy or len(historical_occupancy) < 7:
        return {
            "predicted_occupancy": 0,
            "confidence": 0.2,
            "trend": "insufficient_data",
            "prediction": "Insufficient historical data for occupancy prediction",
        }
    
    occupancy_rates = [o.get("occupancy_rate", 0) for o in historical_occupancy[-30:]]
    avg_occupancy = sum(occupancy_rates) / len(occupancy_rates) if occupancy_rates else 0
    
    # Simple moving average prediction
    trend = "increasing" if occupancy_rates and occupancy_rates[-1] > occupancy_rates[0] else "decreasing" if occupancy_rates and occupancy_rates[-1] < occupancy_rates[0] else "stable"
    
    predicted = min(avg_occupancy + 5, 100) if trend == "increasing" else max(avg_occupancy - 5, 0) if trend == "decreasing" else avg_occupancy
    
    return {
        "predicted_occupancy_rate": predicted,
        "confidence": 0.6,
        "trend": trend,
        "prediction": f"Occupancy trend is {trend}. Predicted rate: {predicted:.1f}%.",
        "recommended_actions": [
            "Review admission pipeline" if predicted < 80 else "Consider capacity expansion" if predicted > 95 else "Maintain current capacity management",
        ],
        "home_id": home_id,
        "prediction_date": datetime.now(timezone.utc).isoformat(),
    }


async def predict_staff_turnover(
    home_id: str,
    staff_data: list[dict[str, Any]],
    days_forward: int = 90,
) -> dict[str, Any]:
    """Predict staff turnover risk for workforce planning.
    
    Args:
        home_id: Care home ID
        staff_data: Staff records with tenure, satisfaction, absence data
        days_forward: Prediction horizon
    
    Returns:
        Turnover risk prediction with high-risk staff identified
    """
    high_risk_staff = []
    
    for staff in staff_data:
        risk_factors = 0
        
        # Check for risk indicators
        if staff.get("satisfaction_score", 5) < 3:
            risk_factors += 1
        if staff.get("absence_rate", 0) > 0.1:
            risk_factors += 1
        if staff.get("tenure_months", 0) < 6:
            risk_factors += 1
        if staff.get("overtime_hours", 0) > 20:
            risk_factors += 1
        if staff.get("last_appraisal_date"):
            days_since_appraisal = (datetime.now(timezone.utc) - datetime.fromisoformat(staff["last_appraisal_date"])).days
            if days_since_appraisal > 365:
                risk_factors += 1
        
        if risk_factors >= 3:
            high_risk_staff.append({
                "staff_id": staff.get("id"),
                "name": staff.get("name"),
                "risk_factors": risk_factors,
                "risk_level": "high" if risk_factors >= 4 else "medium",
            })
    
    turnover_risk = len(high_risk_staff) / len(staff_data) if staff_data else 0
    
    return {
        "predicted_turnover_rate": turnover_risk,
        "high_risk_staff_count": len(high_risk_staff),
        "high_risk_staff": high_risk_staff,
        "confidence": 0.5,
        "prediction": f"{len(high_risk_staff)} staff members at elevated turnover risk ({turnover_risk:.1%} of workforce).",
        "recommended_actions": [
            "Conduct stay interviews with high-risk staff" if high_risk_staff else "Continue current retention practices",
            "Review workload distribution",
            "Schedule appraisals for overdue staff",
        ],
        "home_id": home_id,
        "prediction_date": datetime.now(timezone.utc).isoformat(),
    }


async def generate_predictive_dashboard(
    home_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Generate complete predictive analytics dashboard for a care home.
    
    Args:
        home_id: Care home ID
        db: Database session
    
    Returns:
        Dashboard data with all predictions
    """
    dashboard = {
        "home_id": home_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "predictions": {},
    }
    
    try:
        # Get all active residents
        from app.models.resident import Resident
        residents_result = await db.execute(
            select(Resident).where(Resident.home_id == home_id).where(Resident.status == "active")
        )
        residents = residents_result.scalars().all()
        
        # Deterioration predictions
        deterioration_predictions = []
        for resident in residents:
            from app.models.deterioration_alert import DeteriorationAlert
            alerts_result = await db.execute(
                select(DeteriorationAlert)
                .where(DeteriorationAlert.resident_id == str(resident.id))
                .order_by(DeteriorationAlert.created_at.desc())
                .limit(14)
            )
            alerts = alerts_result.scalars().all()
            
            if alerts:
                historical = [
                    {
                        "date": a.created_at.isoformat() if a.created_at else None,
                        "score": a.risk_score,
                        "alert_level": a.alert_level,
                        "pattern": a.most_likely_pattern,
                    }
                    for a in alerts
                ]
                
                prediction = await predict_deterioration_risk(
                    resident={"id": str(resident.id), "name": resident.name, "age": resident.age, "primary_need": resident.primary_need},
                    historical_scores=historical,
                )
                
                deterioration_predictions.append({
                    "resident_id": str(resident.id),
                    "resident_name": resident.name,
                    "prediction": prediction,
                })
        
        dashboard["predictions"]["deterioration"] = deterioration_predictions
        
        # Falls predictions
        falls_predictions = []
        for resident in residents:
            from app.models.falls_risk import FallsRisk
            risks_result = await db.execute(
                select(FallsRisk)
                .where(FallsRisk.resident_id == str(resident.id))
                .order_by(FallsRisk.created_at.desc())
                .limit(7)
            )
            risks = risks_result.scalars().all()
            
            if risks:
                historical = [
                    {
                        "date": r.created_at.isoformat() if r.created_at else None,
                        "score": r.score,
                    }
                    for r in risks
                ]
                
                prediction = await predict_falls_risk(
                    resident={"id": str(resident.id), "name": resident.name},
                    historical_scores=historical,
                )
                
                falls_predictions.append({
                    "resident_id": str(resident.id),
                    "resident_name": resident.name,
                    "prediction": prediction,
                })
        
        dashboard["predictions"]["falls"] = falls_predictions
        
        # High-risk residents summary
        high_risk = [
            p for p in deterioration_predictions
            if p["prediction"].get("predicted_risk_score", 0) >= 7
        ]
        
        dashboard["high_risk_residents"] = high_risk
        dashboard["total_residents"] = len(residents)
        dashboard["high_risk_count"] = len(high_risk)
        
    except Exception as e:
        logger.error(f"Failed to generate predictive dashboard: {e}")
        dashboard["error"] = str(e)
    
    return dashboard


def _parse_json_safely(text: str) -> dict[str, Any]:
    """Extract JSON from text safely."""
    import json
    text = text.strip()
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        return {"raw_response": text, "parse_error": True}
