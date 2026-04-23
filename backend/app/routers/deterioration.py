from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.deterioration_detector import detect_deterioration


router = APIRouter(prefix="/deterioration", tags=["deterioration"])


class DeteriorationRequest(BaseModel):
    notes: list[str]


@router.post("/scan")
async def scan(payload: DeteriorationRequest) -> dict[str, object]:
    return detect_deterioration(payload.notes)
