from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.demo_data import CARE_NOTES, RESIDENTS


router = APIRouter(prefix="/residents", tags=["residents"])


class ResidentWrite(BaseModel):
    name: str
    room: str
    age: int
    mobility: str = ""
    primary_need: str
    falls_risk: str = "medium"
    deterioration: str = "low"
    hydration: str = "stable"
    family_contact: str = ""
    care_plan_review: str


@router.get("")
async def list_residents() -> list[dict[str, object]]:
    return RESIDENTS


@router.get("/{resident_id}")
async def get_resident(resident_id: str) -> dict[str, object]:
    resident = next((item for item in RESIDENTS if item["id"] == resident_id), None)
    if resident is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return {
        **resident,
        "timeline": [note for note in CARE_NOTES if note["resident_id"] == resident_id],
    }


@router.post("", status_code=201)
async def create_resident(payload: ResidentWrite) -> dict[str, object]:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if payload.age < 18:
        raise HTTPException(status_code=400, detail="age must be 18 or older")

    resident = {
        "id": f"res-{uuid4().hex[:8]}",
        "name": payload.name.strip(),
        "room": payload.room.strip(),
        "age": payload.age,
        "mobility": payload.mobility.strip(),
        "primary_need": payload.primary_need.strip(),
        "falls_risk": payload.falls_risk.lower(),
        "deterioration": payload.deterioration.lower(),
        "hydration": payload.hydration.lower(),
        "family_contact": payload.family_contact.strip(),
        "care_plan_review": payload.care_plan_review,
    }
    RESIDENTS.append(resident)
    return resident


@router.put("/{resident_id}")
async def update_resident(resident_id: str, payload: ResidentWrite) -> dict[str, object]:
    resident = next((item for item in RESIDENTS if item["id"] == resident_id), None)
    if resident is None:
        raise HTTPException(status_code=404, detail="Resident not found")

    resident.update(
        {
            "name": payload.name.strip(),
            "room": payload.room.strip(),
            "age": payload.age,
            "mobility": payload.mobility.strip(),
            "primary_need": payload.primary_need.strip(),
            "falls_risk": payload.falls_risk.lower(),
            "deterioration": payload.deterioration.lower(),
            "hydration": payload.hydration.lower(),
            "family_contact": payload.family_contact.strip(),
            "care_plan_review": payload.care_plan_review,
        }
    )
    return resident
