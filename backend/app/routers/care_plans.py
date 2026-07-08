from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.care_plan_generator import generate_care_plan


router = APIRouter(prefix="/care-plans", tags=["care plans"])


class CarePlanGenerateRequest(BaseModel):
    resident: dict[str, object]
    assessment_data: dict[str, object]
    existing_plan: dict[str, object] | None = None


@router.post("/generate")
async def generate_care_plan_endpoint(payload: CarePlanGenerateRequest) -> dict[str, object]:
    """Generate AI-assisted care plan draft using Claude Sonnet."""
    return await generate_care_plan(
        resident=payload.resident,
        assessment_data=payload.assessment_data,
        existing_plan=payload.existing_plan,
    )
