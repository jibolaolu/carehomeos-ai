from __future__ import annotations

from fastapi import APIRouter

from app.demo_data import FINANCE


router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/summary")
async def summary() -> dict[str, object]:
    return FINANCE
