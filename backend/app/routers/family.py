from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(prefix="/family", tags=["family"])


class FamilyUpdateRequest(BaseModel):
    resident: str
    note_summary: str


@router.post("/updates/preview")
async def preview_update(payload: FamilyUpdateRequest) -> dict[str, object]:
    return {
        "resident": payload.resident,
        "message": f"{payload.resident} had a settled day. {payload.note_summary} The team will continue to keep you updated.",
        "clinical_terms_removed": True,
    }
