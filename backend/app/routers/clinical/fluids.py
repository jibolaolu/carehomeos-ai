from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.fluid_balance import FluidBalance
from app.models.resident import Resident

router = APIRouter(prefix="/clinical/fluids", tags=["clinical / fluids"])


class FluidBalanceCreate(BaseModel):
    resident_id: str
    recorded_at: datetime
    balance_date: date
    entry_type: str
    fluid_type: str
    route: str
    volume_ml: int = Field(..., ge=0)
    is_intake: bool
    target_intake_ml: int | None = Field(None, ge=0)
    notes: str | None = None


class FluidBalanceUpdate(BaseModel):
    recorded_at: datetime | None = None
    balance_date: date | None = None
    entry_type: str | None = None
    fluid_type: str | None = None
    route: str | None = None
    volume_ml: int | None = Field(None, ge=0)
    is_intake: bool | None = None
    target_intake_ml: int | None = Field(None, ge=0)
    notes: str | None = None


async def _recalculate_cumulative_balance(
    db: AsyncSession,
    resident_id: str,
    balance_date: date,
) -> None:
    """Recalculate cumulative intake/output/balance for a resident on a given date."""
    stmt = (
        select(FluidBalance)
        .where(
            FluidBalance.resident_id == resident_id,
            FluidBalance.balance_date == balance_date,
        )
        .order_by(FluidBalance.recorded_at.asc())
    )
    result = await db.execute(stmt)
    entries = result.scalars().all()

    cumulative_intake = 0
    cumulative_output = 0
    target = None

    for entry in entries:
        if entry.is_intake:
            cumulative_intake += entry.volume_ml
        else:
            cumulative_output += entry.volume_ml
        if entry.target_intake_ml is not None:
            target = entry.target_intake_ml

    balance = cumulative_intake - cumulative_output
    deviation = None
    if target is not None:
        deviation = cumulative_intake - target

    for entry in entries:
        entry.cumulative_intake_ml = cumulative_intake
        entry.cumulative_output_ml = cumulative_output
        entry.cumulative_balance_ml = balance
        entry.target_intake_ml = target
        entry.deviation_from_target_ml = deviation
        entry.deviation_alert_triggered = bool(deviation is not None and deviation < -500)


@router.get("")
async def list_fluid_balances(
    resident_id: str | None = None,
    balance_date: date | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = select(FluidBalance)
    if resident_id:
        stmt = stmt.where(FluidBalance.resident_id == resident_id)
    if balance_date:
        stmt = stmt.where(FluidBalance.balance_date == balance_date)
    result = await db.execute(stmt)
    entries = result.scalars().all()
    return [_serialize(e) for e in entries]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_fluid_balance(
    payload: FluidBalanceCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    resident_result = await db.execute(select(Resident).where(Resident.id == payload.resident_id))
    if resident_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Resident not found")

    entry = FluidBalance(
        resident_id=payload.resident_id,
        recorded_by_id="system",
        recorded_at=payload.recorded_at,
        balance_date=payload.balance_date,
        entry_type=payload.entry_type,
        fluid_type=payload.fluid_type,
        route=payload.route,
        volume_ml=payload.volume_ml,
        is_intake=payload.is_intake,
        target_intake_ml=payload.target_intake_ml,
        notes=payload.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    await _recalculate_cumulative_balance(db, payload.resident_id, payload.balance_date)
    await db.commit()
    await db.refresh(entry)
    return _serialize(entry)


@router.get("/{entry_id}")
async def get_fluid_balance(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(FluidBalance).where(FluidBalance.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Fluid balance record not found")
    return _serialize(entry)


@router.put("/{entry_id}")
async def update_fluid_balance(
    entry_id: str,
    payload: FluidBalanceUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(FluidBalance).where(FluidBalance.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Fluid balance record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)

    await db.commit()
    await db.refresh(entry)

    await _recalculate_cumulative_balance(db, entry.resident_id, entry.balance_date)
    await db.commit()
    await db.refresh(entry)
    return _serialize(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fluid_balance(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(FluidBalance).where(FluidBalance.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Fluid balance record not found")
    await db.delete(entry)
    await db.commit()


@router.get("/{resident_id}/balance")
async def get_daily_balance(
    resident_id: str,
    balance_date: date | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if balance_date is None:
        balance_date = date.today()

    stmt = (
        select(FluidBalance)
        .where(
            FluidBalance.resident_id == resident_id,
            FluidBalance.balance_date == balance_date,
        )
        .order_by(FluidBalance.recorded_at.asc())
    )
    result = await db.execute(stmt)
    entries = result.scalars().all()

    if not entries:
        return {
            "resident_id": resident_id,
            "balance_date": balance_date.isoformat(),
            "cumulative_intake_ml": 0,
            "cumulative_output_ml": 0,
            "cumulative_balance_ml": 0,
            "target_intake_ml": None,
            "deviation_from_target_ml": None,
            "entries": [],
        }

    latest = entries[-1]
    return {
        "resident_id": resident_id,
        "balance_date": balance_date.isoformat(),
        "cumulative_intake_ml": latest.cumulative_intake_ml,
        "cumulative_output_ml": latest.cumulative_output_ml,
        "cumulative_balance_ml": latest.cumulative_balance_ml,
        "target_intake_ml": latest.target_intake_ml,
        "deviation_from_target_ml": latest.deviation_from_target_ml,
        "deviation_alert_triggered": latest.deviation_alert_triggered,
        "entries": [_serialize(e) for e in entries],
    }


def _serialize(e: FluidBalance) -> dict[str, Any]:
    return {
        "id": e.id,
        "resident_id": e.resident_id,
        "recorded_by_id": e.recorded_by_id,
        "recorded_at": e.recorded_at.isoformat() if e.recorded_at else None,
        "balance_date": e.balance_date.isoformat() if e.balance_date else None,
        "entry_type": e.entry_type,
        "fluid_type": e.fluid_type,
        "route": e.route,
        "volume_ml": e.volume_ml,
        "is_intake": e.is_intake,
        "cumulative_intake_ml": e.cumulative_intake_ml,
        "cumulative_output_ml": e.cumulative_output_ml,
        "cumulative_balance_ml": e.cumulative_balance_ml,
        "target_intake_ml": e.target_intake_ml,
        "deviation_from_target_ml": e.deviation_from_target_ml,
        "deviation_alert_triggered": e.deviation_alert_triggered,
        "notes": e.notes,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }
