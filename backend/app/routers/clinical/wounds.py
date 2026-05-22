from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.wound_assessment import WoundAssessment

router = APIRouter(prefix="/clinical/wounds", tags=["clinical / wounds"])


@router.get("")
async def list_wound_assessments(
    resident_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    query = select(WoundAssessment)
    if resident_id:
        query = query.where(WoundAssessment.resident_id == resident_id)
    result = await db.execute(query.order_by(WoundAssessment.assessment_date.desc()))
    assessments = result.scalars().all()
    return [
        {
            "id": a.id,
            "resident_id": a.resident_id,
            "assessment_date": a.assessment_date.isoformat() if a.assessment_date else None,
            "wound_location": a.wound_location,
            "wound_type": a.wound_type,
            "healing_status": a.healing_status,
            "dressing_type": a.dressing_type,
            "next_dressing_change": a.next_dressing_change.isoformat() if a.next_dressing_change else None,
            "photo_urls": a.photo_urls,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in assessments
    ]


@router.post("")
async def create_wound_assessment(
    payload: dict[str, object],
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    assessment = WoundAssessment(**payload)
    db.add(assessment)
    await db.flush()
    return {"id": assessment.id, "message": "Wound assessment created"}


@router.get("/{assessment_id}")
async def get_wound_assessment(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    assessment = await db.get(WoundAssessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "id": assessment.id,
        "resident_id": assessment.resident_id,
        "assessment_date": assessment.assessment_date.isoformat() if assessment.assessment_date else None,
        "wound_location": assessment.wound_location,
        "body_map_x": assessment.body_map_x,
        "body_map_y": assessment.body_map_y,
        "wound_type": assessment.wound_type,
        "length_cm": assessment.length_cm,
        "width_cm": assessment.width_cm,
        "depth_cm": assessment.depth_cm,
        "tissue_type": assessment.tissue_type,
        "exudate_amount": assessment.exudate_amount,
        "odour": assessment.odour,
        "pain_score": assessment.pain_score,
        "healing_status": assessment.healing_status,
        "dressing_type": assessment.dressing_type,
        "next_dressing_change": assessment.next_dressing_change.isoformat() if assessment.next_dressing_change else None,
        "photo_urls": assessment.photo_urls,
        "plan": assessment.plan,
        "referral_made": assessment.referral_made,
        "notes": assessment.notes,
    }


@router.put("/{assessment_id}")
async def update_wound_assessment(
    assessment_id: str,
    payload: dict[str, object],
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    assessment = await db.get(WoundAssessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    for key, value in payload.items():
        if hasattr(assessment, key):
            setattr(assessment, key, value)
    return {"id": assessment.id, "message": "Wound assessment updated"}


@router.delete("/{assessment_id}")
async def delete_wound_assessment(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    assessment = await db.get(WoundAssessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    await db.delete(assessment)
    return {"message": "Wound assessment deleted"}
