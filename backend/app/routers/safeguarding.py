from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.safeguarding import SafeguardingAlert, SafeguardingCase
from app.schemas.safeguarding import AlertOut, CaseCreate, CaseOut, CaseUpdate, PaginatedResponse

router = APIRouter(prefix="/safeguarding", tags=["safeguarding"])


def _get_user(request: Request) -> dict[str, Any]:
    user = request.scope.get("state", {}).get("user") or {}
    if not user.get("care_home_id"):
        raise HTTPException(status_code=401, detail="Authenticated user required")
    return user


@router.get("/alerts", response_model=PaginatedResponse)
async def list_alerts(
    request: Request,
    resident_id: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    query = select(SafeguardingAlert).where(SafeguardingAlert.care_home_id == user["care_home_id"])
    count_query = select(SafeguardingAlert).where(SafeguardingAlert.care_home_id == user["care_home_id"])

    if resident_id:
        query = query.where(SafeguardingAlert.resident_id == resident_id)
        count_query = count_query.where(SafeguardingAlert.resident_id == resident_id)
    if status:
        query = query.where(SafeguardingAlert.status == status)
        count_query = count_query.where(SafeguardingAlert.status == status)
    if severity:
        query = query.where(SafeguardingAlert.severity == severity)
        count_query = count_query.where(SafeguardingAlert.severity == severity)

    query = query.order_by(SafeguardingAlert.created_at.desc()).limit(limit).offset(offset)

    items = await db.execute(query)
    count = await db.execute(count_query)
    return {
        "items": [AlertOut.model_validate(a) for a in items.scalars().all()],
        "total": len(count.scalars().all()),
    }


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AlertOut:
    user = _get_user(request)
    result = await db.execute(
        select(SafeguardingAlert).where(
            SafeguardingAlert.id == alert_id,
            SafeguardingAlert.care_home_id == user["care_home_id"],
        )
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "acknowledged"
    alert.acknowledged_by_user_id = str(user.get("id", "local-manager"))
    alert.acknowledged_at = datetime.now(timezone.utc)
    await db.flush()
    return AlertOut.model_validate(alert)


@router.get("/cases", response_model=PaginatedResponse)
async def list_cases(
    request: Request,
    resident_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    query = select(SafeguardingCase).where(SafeguardingCase.care_home_id == user["care_home_id"])
    count_query = select(SafeguardingCase).where(SafeguardingCase.care_home_id == user["care_home_id"])

    if resident_id:
        query = query.where(SafeguardingCase.resident_id == resident_id)
        count_query = count_query.where(SafeguardingCase.resident_id == resident_id)
    if status:
        query = query.where(SafeguardingCase.status == status)
        count_query = count_query.where(SafeguardingCase.status == status)

    query = query.order_by(SafeguardingCase.opened_at.desc()).limit(limit).offset(offset)

    items = await db.execute(query)
    count = await db.execute(count_query)
    return {
        "items": [CaseOut.model_validate(c) for c in items.scalars().all()],
        "total": len(count.scalars().all()),
    }


@router.get("/cases/{case_id}", response_model=CaseOut)
async def get_case(
    case_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> CaseOut:
    user = _get_user(request)
    result = await db.execute(
        select(SafeguardingCase).where(
            SafeguardingCase.id == case_id,
            SafeguardingCase.care_home_id == user["care_home_id"],
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseOut.model_validate(case)


@router.post("/cases", response_model=CaseOut, status_code=201)
async def create_case(
    request: Request,
    payload: CaseCreate,
    db: AsyncSession = Depends(get_db),
) -> CaseOut:
    user = _get_user(request)
    import uuid
    reference = f"SG-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    case = SafeguardingCase(
        id=str(uuid.uuid4()),
        care_home_id=user["care_home_id"],
        resident_id=payload.resident_id,
        reference=reference,
        status="open",
        risk_level=payload.risk_level,
        opened_by_user_id=str(user.get("id", "local-manager")),
    )
    db.add(case)
    await db.flush()
    return CaseOut.model_validate(case)


@router.patch("/cases/{case_id}", response_model=CaseOut)
async def update_case(
    case_id: str,
    request: Request,
    payload: CaseUpdate,
    db: AsyncSession = Depends(get_db),
) -> CaseOut:
    user = _get_user(request)
    result = await db.execute(
        select(SafeguardingCase).where(
            SafeguardingCase.id == case_id,
            SafeguardingCase.care_home_id == user["care_home_id"],
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    data = payload.model_dump(exclude_unset=True)
    for field in {"status", "risk_level", "assigned_to_user_id", "closure_summary", "referral_made", "referral_authority", "referral_reference"}:
        if field in data:
            setattr(case, field, data[field])

    if data.get("status") == "closed" and not case.closed_at:
        case.closed_at = datetime.now(timezone.utc)
        case.closed_by_user_id = str(user.get("id", "local-manager"))

    if data.get("referral_made") and not case.referral_made_at:
        case.referral_made_at = datetime.now(timezone.utc)

    await db.flush()
    return CaseOut.model_validate(case)
