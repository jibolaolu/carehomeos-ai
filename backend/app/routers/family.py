from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.family_update_generator import generate_family_update


router = APIRouter(prefix="/family", tags=["family"])


class FamilyUpdateRequest(BaseModel):
    resident: dict[str, object]
    note_summary: str
    recent_activities: list[str] | None = None
    mood: str | None = None


@router.post("/updates/preview")
async def preview_update(payload: FamilyUpdateRequest) -> dict[str, object]:
    """Generate a warm family update using Claude Sonnet."""
    return await generate_family_update(
        resident=payload.resident,
        note_summary=payload.note_summary,
        recent_activities=payload.recent_activities,
        mood=payload.mood,
    )
