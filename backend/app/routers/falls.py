from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.falls_risk_scorer import score_falls_risk


router = APIRouter(prefix="/falls", tags=["falls"])


class FallsRiskRequest(BaseModel):
    falls_last_90_days: int = 0
    mobility: str = ""
    confusion: bool = False
    medication_count: int = 0
    night_wandering: bool = False


@router.post("/risk-score")
async def risk_score(payload: FallsRiskRequest) -> dict[str, object]:
    return score_falls_risk(payload.model_dump())
