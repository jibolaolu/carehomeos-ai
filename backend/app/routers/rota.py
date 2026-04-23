from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.demo_data import STAFF


router = APIRouter(prefix="/rota", tags=["rota"])


ROTA_SHIFTS: list[dict[str, object]] = [
    {"id": "shift-001", "day": "Monday", "time": "07:30-15:30", "staff": "Amelia Williams", "role": "Senior carer", "zone": "Residential", "status": "confirmed"},
    {"id": "shift-002", "day": "Monday", "time": "08:00-20:00", "staff": "Priya Nair", "role": "Nurse", "zone": "Nursing", "status": "confirmed"},
    {"id": "shift-003", "day": "Monday", "time": "14:00-22:00", "staff": "Sam Brooks", "role": "Carer", "zone": "Dementia", "status": "gap"},
]


class RotaShiftWrite(BaseModel):
    day: str
    time: str
    staff: str
    role: str
    zone: str = "Residential"
    status: str = "confirmed"


@router.get("/today")
async def today_rota() -> dict[str, object]:
    gaps = [shift for shift in ROTA_SHIFTS if shift["status"] in {"gap", "open"}]
    return {
        "coverage": "review" if gaps else "safe",
        "ratio": "1:6 day shift",
        "shifts": STAFF,
        "rota": ROTA_SHIFTS,
        "gaps": gaps or [{"time": "20:00-22:00", "role": "Senior carer", "status": "bank request sent"}],
    }


@router.post("/shifts", status_code=201)
async def create_rota_shift(payload: RotaShiftWrite) -> dict[str, object]:
    if not payload.staff.strip():
        raise HTTPException(status_code=400, detail="staff is required")

    shift = {
        "id": f"shift-{uuid4().hex[:8]}",
        "day": payload.day,
        "time": payload.time,
        "staff": payload.staff.strip(),
        "role": payload.role.strip(),
        "zone": payload.zone,
        "status": payload.status,
    }
    ROTA_SHIFTS.append(shift)
    return shift
