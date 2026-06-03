from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.end_of_life import EndOfLifeCare
from app.models.resident import Resident

router = APIRouter(prefix="/clinical/eol", tags=["clinical / end of life"])


class EndOfLifeCareCreate(BaseModel):
    resident_id: str
    eol_care_plan_active: bool = False
    eol_care_plan_date: date | None = None
    estimated_prognosis: str | None = None
    preferred_place_of_death: str | None = None
    dnar_in_place: bool = False
    dnar_date: date | None = None
    dnar_discussed_with_resident: bool = False
    dnar_discussed_with_family: bool = False
    dnar_discussed_with_gp: bool = False
    dnar_document_url: str | None = None
    advance_decision_to_refuse_treatment: bool = False
    adrt_date: date | None = None
    adrt_document_url: str | None = None
    lpa_health_welfare_name: str | None = None
    lpa_health_welfare_phone: str | None = None
    coordinate_my_care_registered: bool = False
    cmc_plan_url: str | None = None
    anticipatory_prescribing_in_place: bool = False
    just_in_case_medications: str | None = None
    symptom_management_plan: str | None = None
    spiritual_support_needs: str | None = None
    family_support_plan: str | None = None
    bereavement_support_offered: bool = False
    gp_visits_frequency: str | None = None
    district_nurse_involved: bool = False
    specialist_palliative_care_involved: bool = False
    chaplaincy_involved: bool = False
    notes: str | None = None


class EndOfLifeCareUpdate(BaseModel):
    eol_care_plan_active: bool | None = None
    eol_care_plan_date: date | None = None
    estimated_prognosis: str | None = None
    preferred_place_of_death: str | None = None
    dnar_in_place: bool | None = None
    dnar_date: date | None = None
    dnar_discussed_with_resident: bool | None = None
    dnar_discussed_with_family: bool | None = None
    dnar_discussed_with_gp: bool | None = None
    dnar_document_url: str | None = None
    advance_decision_to_refuse_treatment: bool | None = None
    adrt_date: date | None = None
    adrt_document_url: str | None = None
    lpa_health_welfare_name: str | None = None
    lpa_health_welfare_phone: str | None = None
    coordinate_my_care_registered: bool | None = None
    cmc_plan_url: str | None = None
    anticipatory_prescribing_in_place: bool | None = None
    just_in_case_medications: str | None = None
    symptom_management_plan: str | None = None
    spiritual_support_needs: str | None = None
    family_support_plan: str | None = None
    bereavement_support_offered: bool | None = None
    gp_visits_frequency: str | None = None
    district_nurse_involved: bool | None = None
    specialist_palliative_care_involved: bool | None = None
    chaplaincy_involved: bool | None = None
    notes: str | None = None


@router.get("")
async def list_eol_records(
    resident_id: str | None = None,
    eol_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = select(EndOfLifeCare)
    if resident_id:
        stmt = stmt.where(EndOfLifeCare.resident_id == resident_id)
    if eol_active is not None:
        stmt = stmt.where(EndOfLifeCare.eol_care_plan_active == eol_active)
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [_serialize(r) for r in records]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_eol_record(
    payload: EndOfLifeCareCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    resident_result = await db.execute(select(Resident).where(Resident.id == payload.resident_id))
    if resident_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Resident not found")

    existing = await db.execute(
        select(EndOfLifeCare).where(EndOfLifeCare.resident_id == payload.resident_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="EOL record already exists for this resident")

    record = EndOfLifeCare(
        resident_id=payload.resident_id,
        eol_care_plan_active=payload.eol_care_plan_active,
        eol_care_plan_date=payload.eol_care_plan_date,
        estimated_prognosis=payload.estimated_prognosis,
        preferred_place_of_death=payload.preferred_place_of_death,
        dnar_in_place=payload.dnar_in_place,
        dnar_date=payload.dnar_date,
        dnar_discussed_with_resident=payload.dnar_discussed_with_resident,
        dnar_discussed_with_family=payload.dnar_discussed_with_family,
        dnar_discussed_with_gp=payload.dnar_discussed_with_gp,
        dnar_document_url=payload.dnar_document_url,
        advance_decision_to_refuse_treatment=payload.advance_decision_to_refuse_treatment,
        adrt_date=payload.adrt_date,
        adrt_document_url=payload.adrt_document_url,
        lpa_health_welfare_name=payload.lpa_health_welfare_name,
        lpa_health_welfare_phone=payload.lpa_health_welfare_phone,
        coordinate_my_care_registered=payload.coordinate_my_care_registered,
        cmc_plan_url=payload.cmc_plan_url,
        anticipatory_prescribing_in_place=payload.anticipatory_prescribing_in_place,
        just_in_case_medications=payload.just_in_case_medications,
        symptom_management_plan=payload.symptom_management_plan,
        spiritual_support_needs=payload.spiritual_support_needs,
        family_support_plan=payload.family_support_plan,
        bereavement_support_offered=payload.bereavement_support_offered,
        gp_visits_frequency=payload.gp_visits_frequency,
        district_nurse_involved=payload.district_nurse_involved,
        specialist_palliative_care_involved=payload.specialist_palliative_care_involved,
        chaplaincy_involved=payload.chaplaincy_involved,
        notes=payload.notes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _serialize(record)


@router.get("/{record_id}")
async def get_eol_record(
    record_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(EndOfLifeCare).where(EndOfLifeCare.id == record_id))
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="EOL record not found")
    return _serialize(record)


@router.put("/{record_id}")
async def update_eol_record(
    record_id: str,
    payload: EndOfLifeCareUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(EndOfLifeCare).where(EndOfLifeCare.id == record_id))
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="EOL record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    await db.commit()
    await db.refresh(record)
    return _serialize(record)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_eol_record(
    record_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EndOfLifeCare).where(EndOfLifeCare.id == record_id))
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="EOL record not found")
    await db.delete(record)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _serialize(r: EndOfLifeCare) -> dict[str, Any]:
    return {
        "id": r.id,
        "resident_id": r.resident_id,
        "eol_care_plan_active": r.eol_care_plan_active,
        "eol_care_plan_date": r.eol_care_plan_date.isoformat() if r.eol_care_plan_date else None,
        "estimated_prognosis": r.estimated_prognosis,
        "preferred_place_of_death": r.preferred_place_of_death,
        "dnar_in_place": r.dnar_in_place,
        "dnar_date": r.dnar_date.isoformat() if r.dnar_date else None,
        "dnar_discussed_with_resident": r.dnar_discussed_with_resident,
        "dnar_discussed_with_family": r.dnar_discussed_with_family,
        "dnar_discussed_with_gp": r.dnar_discussed_with_gp,
        "dnar_document_url": r.dnar_document_url,
        "advance_decision_to_refuse_treatment": r.advance_decision_to_refuse_treatment,
        "adrt_date": r.adrt_date.isoformat() if r.adrt_date else None,
        "adrt_document_url": r.adrt_document_url,
        "lpa_health_welfare_name": r.lpa_health_welfare_name,
        "lpa_health_welfare_phone": r.lpa_health_welfare_phone,
        "coordinate_my_care_registered": r.coordinate_my_care_registered,
        "cmc_plan_url": r.cmc_plan_url,
        "anticipatory_prescribing_in_place": r.anticipatory_prescribing_in_place,
        "just_in_case_medications": r.just_in_case_medications,
        "symptom_management_plan": r.symptom_management_plan,
        "spiritual_support_needs": r.spiritual_support_needs,
        "family_support_plan": r.family_support_plan,
        "bereavement_support_offered": r.bereavement_support_offered,
        "gp_visits_frequency": r.gp_visits_frequency,
        "district_nurse_involved": r.district_nurse_involved,
        "specialist_palliative_care_involved": r.specialist_palliative_care_involved,
        "chaplaincy_involved": r.chaplaincy_involved,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
