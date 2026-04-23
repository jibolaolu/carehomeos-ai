from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.demo_data import MEDICATION_ROUND


router = APIRouter(prefix="/mar", tags=["mar"])


class AdministrationRequest(BaseModel):
    resident: str
    medication: str
    status: str
    recorded_by: str


@router.get("/rounds/today")
async def today_round() -> list[dict[str, object]]:
    return MEDICATION_ROUND


@router.post("/administrations")
async def record_administration(payload: AdministrationRequest) -> dict[str, object]:
    return {
        "resident": payload.resident,
        "medication": payload.medication,
        "status": payload.status,
        "recorded_by": payload.recorded_by,
        "audit_written": True,
    }
