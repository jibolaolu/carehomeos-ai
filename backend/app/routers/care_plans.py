from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/care-plans", tags=["care plans"])


@router.get("/reviews-due")
async def reviews_due() -> list[dict[str, object]]:
    return [
        {"resident": "Evelyn Morgan", "domain": "Pressure care", "due": "2026-04-24"},
        {"resident": "Margaret Ellis", "domain": "Falls prevention", "due": "2026-04-26"},
    ]
