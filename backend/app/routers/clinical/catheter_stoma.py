from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.catheter_stoma import CatheterStomaRecord
from app.models.resident import Resident

router = APIRouter(prefix="/clinical/catheter-stoma", tags=["clinical / catheter & stoma"])


class CatheterStomaCreate(BaseModel):
    resident_id: str
    record_type: str
    insertion_date: date
    catheter_type: str | None = None
    catheter_size: str | None = None
    stoma_type: str | None = None
    stoma_location: str | None = None
    brand: str | None = None
    batch_number: str | None = None
    change_frequency_days: int | None = Field(None, ge=1)
    next_change_due: date | None = None
    urine_colour: str | None = None
    urine_clarity: str | None = None
    urine_odour: str | None = None
    urine_amount_ml: int | None = Field(None, ge=0)
    stoma_output_consistency: str | None = None
    stoma_output_amount: str | None = None
    peristomal_skin_condition: str | None = None
    complications: str | None = None
    notes: str | None = None


class CatheterStomaUpdate(BaseModel):
    record_type: str | None = None
    insertion_date: date | None = None
    catheter_type: str | None = None
    catheter_size: str | None = None
    stoma_type: str | None = None
    stoma_location: str | None = None
    brand: str | None = None
    batch_number: str | None = None
    change_frequency_days: int | None = Field(None, ge=1)
    next_change_due: date | None = None
    urine_colour: str | None = None
    urine_clarity: str | None = None
    urine_odour: str | None = None
    urine_amount_ml: int | None = Field(None, ge=0)
    stoma_output_consistency: str | None = None
    stoma_output_amount: str | None = None
    peristomal_skin_condition: str | None = None
    complications: str | None = None
    notes: str | None = None
    is_active: bool | None = None
    removed_date: date | None = None
    removed_reason: str | None = None


@router.get("")
async def list_catheter_stoma_records(
    resident_id: str | None = None,
    record_type: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = select(CatheterStomaRecord)
    if resident_id:
        stmt = stmt.where(CatheterStomaRecord.resident_id == resident_id)
    if record_type:
        stmt = stmt.where(CatheterStomaRecord.record_type == record_type)
    if is_active is not None:
        stmt = stmt.where(CatheterStomaRecord.is_active == is_active)
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [_serialize(r) for r in records]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_catheter_stoma_record(
    payload: CatheterStomaCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    resident_result = await db.execute(select(Resident).where(Resident.id == payload.resident_id))
    if resident_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Resident not found")

    record = CatheterStomaRecord(
        resident_id=payload.resident_id,
        recorded_by_id="system",
        record_type=payload.record_type,
        insertion_date=payload.insertion_date,
        catheter_type=payload.catheter_type,
        catheter_size=payload.catheter_size,
        stoma_type=payload.stoma_type,
        stoma_location=payload.stoma_location,
        brand=payload.brand,
        batch_number=payload.batch_number,
        change_frequency_days=payload.change_frequency_days,
        next_change_due=payload.next_change_due,
        urine_colour=payload.urine_colour,
        urine_clarity=payload.urine_clarity,
        urine_odour=payload.urine_odour,
        urine_amount_ml=payload.urine_amount_ml,
        stoma_output_consistency=payload.stoma_output_consistency,
        stoma_output_amount=payload.stoma_output_amount,
        peristomal_skin_condition=payload.peristomal_skin_condition,
        complications=payload.complications,
        notes=payload.notes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _serialize(record)


@router.get("/{record_id}")
async def get_catheter_stoma_record(
    record_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(CatheterStomaRecord).where(CatheterStomaRecord.id == record_id))
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return _serialize(record)


@router.put("/{record_id}")
async def update_catheter_stoma_record(
    record_id: str,
    payload: CatheterStomaUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(CatheterStomaRecord).where(CatheterStomaRecord.id == record_id))
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    await db.commit()
    await db.refresh(record)
    return _serialize(record)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_catheter_stoma_record(
    record_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(CatheterStomaRecord).where(CatheterStomaRecord.id == record_id))
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.delete(record)
    await db.commit()


def _serialize(r: CatheterStomaRecord) -> dict[str, Any]:
    return {
        "id": r.id,
        "resident_id": r.resident_id,
        "recorded_by_id": r.recorded_by_id,
        "record_type": r.record_type,
        "insertion_date": r.insertion_date.isoformat() if r.insertion_date else None,
        "catheter_type": r.catheter_type,
        "catheter_size": r.catheter_size,
        "stoma_type": r.stoma_type,
        "stoma_location": r.stoma_location,
        "brand": r.brand,
        "batch_number": r.batch_number,
        "change_frequency_days": r.change_frequency_days,
        "next_change_due": r.next_change_due.isoformat() if r.next_change_due else None,
        "urine_colour": r.urine_colour,
        "urine_clarity": r.urine_clarity,
        "urine_odour": r.urine_odour,
        "urine_amount_ml": r.urine_amount_ml,
        "stoma_output_consistency": r.stoma_output_consistency,
        "stoma_output_amount": r.stoma_output_amount,
        "peristomal_skin_condition": r.peristomal_skin_condition,
        "complications": r.complications,
        "notes": r.notes,
        "is_active": r.is_active,
        "removed_date": r.removed_date.isoformat() if r.removed_date else None,
        "removed_reason": r.removed_reason,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
