from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/audits", tags=["audits"])


@router.get("/programme")
async def programme() -> dict[str, object]:
    return {
        "month": "April 2026",
        "completion": 78,
        "audits": [
            {"name": "Medication management", "status": "complete", "score": 91},
            {"name": "Infection prevention", "status": "complete", "score": 88},
            {"name": "Care planning", "status": "in progress", "score": 73},
            {"name": "Staffing and recruitment", "status": "scheduled", "score": None},
        ],
    }
