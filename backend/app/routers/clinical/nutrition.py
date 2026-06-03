from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.nutrition_screening import NutritionScreening
from app.models.resident import Resident
from app.services.must_calculator import calculate_must

router = APIRouter(prefix="/clinical/nutrition", tags=["clinical / nutrition"])


class NutritionScreeningCreate(BaseModel):
    resident_id: str
    assessment_date: date
    bmi: float | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    unplanned_weight_loss_kg: float | None = None
    unplanned_weight_loss_percent: float | None = None
    weight_loss_time_months: int | None = None
    acute_disease_effect: bool = False
    malnutrition_risk: bool = False
    recommended_actions: str | None = None
    dietitian_referral_made: bool = False
    dietitian_referral_date: date | None = None
    supplement_prescribed: bool = False
    supplement_details: str | None = None
    food_first_approach: bool = False
    texture_modification: str | None = None
    fluid_target_ml: int | None = Field(None, ge=0)
    next_review_date: date | None = None
    notes: str | None = None


class NutritionScreeningUpdate(BaseModel):
    assessment_date: date | None = None
    bmi: float | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    unplanned_weight_loss_kg: float | None = None
    unplanned_weight_loss_percent: float | None = None
    weight_loss_time_months: int | None = None
    acute_disease_effect: bool | None = None
    malnutrition_risk: bool | None = None
    recommended_actions: str | None = None
    dietitian_referral_made: bool | None = None
    dietitian_referral_date: date | None = None
    supplement_prescribed: bool | None = None
    supplement_details: str | None = None
    food_first_approach: bool | None = None
    texture_modification: str | None = None
    fluid_target_ml: int | None = Field(None, ge=0)
    next_review_date: date | None = None
    notes: str | None = None


@router.get("")
async def list_nutrition_screenings(
    resident_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = select(NutritionScreening)
    if resident_id:
        stmt = stmt.where(NutritionScreening.resident_id == resident_id)
    result = await db.execute(stmt)
    screenings = result.scalars().all()
    return [_serialize(s) for s in screenings]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_nutrition_screening(
    payload: NutritionScreeningCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    resident_result = await db.execute(select(Resident).where(Resident.id == payload.resident_id))
    if resident_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Resident not found")

    # Auto-calculate MUST score
    must = calculate_must(
        bmi=payload.bmi,
        unplanned_weight_loss_percent=payload.unplanned_weight_loss_percent,
        unplanned_weight_loss_kg=payload.unplanned_weight_loss_kg,
        acute_disease_effect=payload.acute_disease_effect,
    )

    screening = NutritionScreening(
        resident_id=payload.resident_id,
        assessed_by_id="system",
        assessment_date=payload.assessment_date,
        bmi=str(payload.bmi) if payload.bmi is not None else None,
        weight_kg=str(payload.weight_kg) if payload.weight_kg is not None else None,
        height_cm=str(payload.height_cm) if payload.height_cm is not None else None,
        unplanned_weight_loss_kg=str(payload.unplanned_weight_loss_kg) if payload.unplanned_weight_loss_kg is not None else None,
        unplanned_weight_loss_percent=str(payload.unplanned_weight_loss_percent) if payload.unplanned_weight_loss_percent is not None else None,
        weight_loss_time_months=payload.weight_loss_time_months,
        acute_disease_effect=payload.acute_disease_effect,
        must_score=must.score,
        must_risk_category=must.risk_category,
        malnutrition_risk=payload.malnutrition_risk or must.risk_category == "high",
        recommended_actions=payload.recommended_actions or "\n".join(must.recommended_actions),
        dietitian_referral_made=payload.dietitian_referral_made,
        dietitian_referral_date=payload.dietitian_referral_date,
        supplement_prescribed=payload.supplement_prescribed,
        supplement_details=payload.supplement_details,
        food_first_approach=payload.food_first_approach,
        texture_modification=payload.texture_modification,
        fluid_target_ml=payload.fluid_target_ml,
        next_review_date=payload.next_review_date,
        notes=payload.notes,
    )
    db.add(screening)
    await db.commit()
    await db.refresh(screening)
    return _serialize(screening)


@router.get("/{screening_id}")
async def get_nutrition_screening(
    screening_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(NutritionScreening).where(NutritionScreening.id == screening_id))
    screening = result.scalar_one_or_none()
    if screening is None:
        raise HTTPException(status_code=404, detail="Nutrition screening not found")
    return _serialize(screening)


@router.put("/{screening_id}")
async def update_nutrition_screening(
    screening_id: str,
    payload: NutritionScreeningUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(NutritionScreening).where(NutritionScreening.id == screening_id))
    screening = result.scalar_one_or_none()
    if screening is None:
        raise HTTPException(status_code=404, detail="Nutrition screening not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ("bmi", "weight_kg", "height_cm", "unplanned_weight_loss_kg", "unplanned_weight_loss_percent") and value is not None:
            value = str(value)
        setattr(screening, key, value)

    # Re-calculate MUST
    must = calculate_must(
        bmi=float(screening.bmi) if screening.bmi is not None else None,
        unplanned_weight_loss_percent=float(screening.unplanned_weight_loss_percent) if screening.unplanned_weight_loss_percent is not None else None,
        unplanned_weight_loss_kg=float(screening.unplanned_weight_loss_kg) if screening.unplanned_weight_loss_kg is not None else None,
        acute_disease_effect=screening.acute_disease_effect,
    )
    screening.must_score = must.score
    screening.must_risk_category = must.risk_category
    if must.risk_category == "high":
        screening.malnutrition_risk = True

    await db.commit()
    await db.refresh(screening)
    return _serialize(screening)


@router.delete(
    "/{screening_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_nutrition_screening(
    screening_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(NutritionScreening).where(NutritionScreening.id == screening_id))
    screening = result.scalar_one_or_none()
    if screening is None:
        raise HTTPException(status_code=404, detail="Nutrition screening not found")
    await db.delete(screening)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _serialize(s: NutritionScreening) -> dict[str, Any]:
    return {
        "id": s.id,
        "resident_id": s.resident_id,
        "assessed_by_id": s.assessed_by_id,
        "assessment_date": s.assessment_date.isoformat() if s.assessment_date else None,
        "bmi": s.bmi,
        "weight_kg": s.weight_kg,
        "height_cm": s.height_cm,
        "unplanned_weight_loss_kg": s.unplanned_weight_loss_kg,
        "unplanned_weight_loss_percent": s.unplanned_weight_loss_percent,
        "weight_loss_time_months": s.weight_loss_time_months,
        "acute_disease_effect": s.acute_disease_effect,
        "must_score": s.must_score,
        "must_risk_category": s.must_risk_category,
        "malnutrition_risk": s.malnutrition_risk,
        "recommended_actions": s.recommended_actions,
        "dietitian_referral_made": s.dietitian_referral_made,
        "dietitian_referral_date": s.dietitian_referral_date.isoformat() if s.dietitian_referral_date else None,
        "supplement_prescribed": s.supplement_prescribed,
        "supplement_details": s.supplement_details,
        "food_first_approach": s.food_first_approach,
        "texture_modification": s.texture_modification,
        "fluid_target_ml": s.fluid_target_ml,
        "next_review_date": s.next_review_date.isoformat() if s.next_review_date else None,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }
