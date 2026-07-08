from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.falls_risk_scorer import score_falls_risk


router = APIRouter(prefix="/falls", tags=["falls"])


class FallsRiskRequest(BaseModel):
    resident: dict[str, object]
    notes: list[dict[str, object]] | None = None
    medications: list[dict[str, object]] | None = None
    incidents: list[dict[str, object]] | None = None
    environment: dict[str, object] | None = None


@router.post("/risk-score")
async def risk_score(payload: FallsRiskRequest) -> dict[str, object]:
    """Calculate falls risk score using GPT-4o mini."""
    return await score_falls_risk(
        resident=payload.resident,
        notes=payload.notes,
        medications=payload.medications,
        incidents=payload.incidents,
        environment=payload.environment,
    )
