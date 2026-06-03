from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.vital_signs import VitalSigns
from app.seed import USER_ID
from app.services.news2_calculator import calculate_news2

router = APIRouter(prefix="/clinical/vitals", tags=["clinical / vitals"])


@router.get("")
async def list_vital_signs(
    resident_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    query = select(VitalSigns)
    if resident_id:
        query = query.where(VitalSigns.resident_id == resident_id)
    result = await db.execute(query.order_by(VitalSigns.recorded_at.desc()))
    vitals = result.scalars().all()
    return [
        {
            "id": v.id,
            "resident_id": v.resident_id,
            "recorded_at": v.recorded_at.isoformat() if v.recorded_at else None,
            "systolic_bp": v.systolic_bp,
            "diastolic_bp": v.diastolic_bp,
            "pulse_rate": v.pulse_rate,
            "respiration_rate": v.respiration_rate,
            "spo2_percent": v.spo2_percent,
            "temperature_celsius": v.temperature_celsius,
            "news2_score": v.news2_score,
            "news2_risk_category": v.news2_risk_category,
            "news2_escalation_triggered": v.news2_escalation_triggered,
        }
        for v in vitals
    ]


@router.post("")
async def create_vital_signs(
    payload: dict[str, object],
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    payload = dict(payload)
    payload.setdefault("recorded_at", datetime.now(timezone.utc).isoformat())
    payload.setdefault("recorded_by_id", USER_ID)
    if isinstance(payload.get("recorded_at"), str):
        payload["recorded_at"] = datetime.fromisoformat(str(payload["recorded_at"]).replace("Z", "+00:00"))
    if payload.get("supplemental_oxygen") is not None and payload.get("spo2_on_o2") is None:
        payload["spo2_on_o2"] = payload["supplemental_oxygen"]

    news2 = calculate_news2(payload)
    payload["news2_score"] = news2["score"]
    payload["news2_risk_category"] = news2["risk_category"]
    payload["news2_escalation_triggered"] = news2["escalation_required"]
    payload["escalation_action"] = news2["escalation_action"]

    vital = VitalSigns(**payload)
    db.add(vital)
    await db.flush()
    return {
        "id": vital.id,
        "news2_score": vital.news2_score,
        "news2_risk_category": vital.news2_risk_category,
        "escalation_triggered": vital.news2_escalation_triggered,
        "message": "Vital signs recorded",
    }


@router.get("/{vital_id}")
async def get_vital_signs(
    vital_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    vital = await db.get(VitalSigns, vital_id)
    if not vital:
        raise HTTPException(status_code=404, detail="Vital signs not found")
    return {
        "id": vital.id,
        "resident_id": vital.resident_id,
        "recorded_at": vital.recorded_at.isoformat() if vital.recorded_at else None,
        "systolic_bp": vital.systolic_bp,
        "diastolic_bp": vital.diastolic_bp,
        "pulse_rate": vital.pulse_rate,
        "respiration_rate": vital.respiration_rate,
        "spo2_percent": vital.spo2_percent,
        "spo2_on_o2": vital.spo2_on_o2,
        "o2_flow_rate": vital.o2_flow_rate,
        "temperature_celsius": vital.temperature_celsius,
        "blood_glucose_mmol": vital.blood_glucose_mmol,
        "consciousness_level": vital.consciousness_level,
        "pain_score": vital.pain_score,
        "weight_kg": vital.weight_kg,
        "news2_score": vital.news2_score,
        "news2_risk_category": vital.news2_risk_category,
        "news2_escalation_triggered": vital.news2_escalation_triggered,
        "escalation_action": vital.escalation_action,
        "notes": vital.notes,
    }


@router.get("/{resident_id}/history")
async def get_vitals_history(
    resident_id: str,
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(VitalSigns)
        .where(VitalSigns.resident_id == resident_id)
        .where(VitalSigns.recorded_at >= cutoff)
        .order_by(VitalSigns.recorded_at.asc())
    )
    vitals = result.scalars().all()
    return {
        "resident_id": resident_id,
        "days": days,
        "count": len(vitals),
        "readings": [
            {
                "recorded_at": v.recorded_at.isoformat() if v.recorded_at else None,
                "systolic_bp": v.systolic_bp,
                "diastolic_bp": v.diastolic_bp,
                "pulse_rate": v.pulse_rate,
                "respiration_rate": v.respiration_rate,
                "spo2_percent": v.spo2_percent,
                "temperature_celsius": v.temperature_celsius,
                "news2_score": v.news2_score,
            }
            for v in vitals
        ],
    }
