from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai.deterioration_detector import detect_deterioration


router = APIRouter(prefix="/deterioration", tags=["deterioration"])


class DeteriorationRequest(BaseModel):
    resident: dict[str, object]
    notes: list[dict[str, object]]
    vitals: list[dict[str, object]] | None = None
    medications: list[dict[str, object]] | None = None
    fluids: list[dict[str, object]] | None = None
    weight_history: list[dict[str, object]] | None = None
    incidents: list[dict[str, object]] | None = None
    days: int = 30


@router.post("/scan")
async def scan(payload: DeteriorationRequest) -> dict[str, object]:
    """Run clinical deterioration analysis using Claude Opus."""
    return await detect_deterioration(
        resident=payload.resident,
        notes=payload.notes,
        vitals=payload.vitals,
        medications=payload.medications,
        fluids=payload.fluids,
        weight_history=payload.weight_history,
        incidents=payload.incidents,
        days=payload.days,
    )
