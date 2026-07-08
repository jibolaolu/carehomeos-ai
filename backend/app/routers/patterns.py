from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.safeguarding import (
    PaginatedResponse,
    PatternDetect,
    PatternSignalOut,
    RiskPatternOut,
)
from app.services.safeguarding.pattern_detector import PatternDetector

router = APIRouter(prefix="/safeguarding/patterns", tags=["patterns"])


def _get_user(request: Request) -> dict[str, Any]:
    user = request.scope.get("state", {}).get("user") or {}
    if not user.get("care_home_id"):
        raise HTTPException(status_code=401, detail="Authenticated user required")
    return user


@router.post("/detect", response_model=RiskPatternOut)
async def detect_patterns(
    request: Request,
    payload: PatternDetect,
    db: AsyncSession = Depends(get_db),
) -> RiskPatternOut:
    user = _get_user(request)
    detector = PatternDetector(db)
    pattern = await detector.scan_resident(
        care_home_id=str(user["care_home_id"]),
        resident_id=payload.resident_id,
        user_id=str(user.get("id", "local-manager")),
        time_window_days=payload.time_window_days,
        pattern_type=payload.pattern_type,
    )
    if not pattern:
        raise HTTPException(status_code=404, detail="No patterns detected for resident in the given window")
    return RiskPatternOut.model_validate(pattern)


@router.get("/signals", response_model=PaginatedResponse)
async def list_signals(
    request: Request,
    resident_id: str | None = None,
    signal_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    detector = PatternDetector(db)
    items, total = await detector.list_signals(
        care_home_id=str(user["care_home_id"]),
        resident_id=resident_id,
        signal_type=signal_type,
        limit=limit,
        offset=offset,
    )
    return {"items": [PatternSignalOut.model_validate(i) for i in items], "total": total}


@router.get("", response_model=PaginatedResponse)
async def list_patterns(
    request: Request,
    resident_id: str | None = None,
    pattern_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    detector = PatternDetector(db)
    items, total = await detector.list_patterns(
        care_home_id=str(user["care_home_id"]),
        resident_id=resident_id,
        pattern_type=pattern_type,
        limit=limit,
        offset=offset,
    )
    return {"items": [RiskPatternOut.model_validate(i) for i in items], "total": total}
