from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.demo_data import STAFF


router = APIRouter(prefix="/staff", tags=["staff"])


class StaffWrite(BaseModel):
    name: str
    role: str
    shift: str
    training: int = 80
    status: str = "active"
    phone: str = ""
    employment_type: str = "Permanent"


@router.get("")
async def list_staff() -> list[dict[str, object]]:
    return STAFF


@router.post("", status_code=201)
async def create_staff(payload: StaffWrite) -> dict[str, object]:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if payload.training < 0 or payload.training > 100:
        raise HTTPException(status_code=400, detail="training must be between 0 and 100")

    member = {
        "id": f"staff-{uuid4().hex[:8]}",
        "name": payload.name.strip(),
        "role": payload.role.strip(),
        "shift": payload.shift.strip(),
        "training": payload.training,
        "status": payload.status,
        "phone": payload.phone.strip(),
        "employment_type": payload.employment_type,
    }
    STAFF.append(member)
    return member
