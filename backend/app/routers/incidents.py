from __future__ import annotations

from fastapi import APIRouter

from app.demo_data import INCIDENTS


router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("")
async def list_incidents() -> list[dict[str, object]]:
    return INCIDENTS
