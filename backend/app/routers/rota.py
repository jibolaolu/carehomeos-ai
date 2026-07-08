from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.rota_optimiser import optimise_rota


router = APIRouter(prefix="/rota", tags=["rota"])


class RotaOptimiseRequest(BaseModel):
    home_id: str
    shift_date: str
    shift_type: str
    staff_pool: list[dict[str, object]]
    resident_dependencies: dict[str, int]
    required_roles: list[str]


@router.post("/optimise")
async def optimise_rota_endpoint(payload: RotaOptimiseRequest) -> dict[str, object]:
    """Generate optimal rota using GPT-4o mini constraint-solving."""
    return await optimise_rota(
        home_id=payload.home_id,
        shift_date=payload.shift_date,
        shift_type=payload.shift_type,
        staff_pool=payload.staff_pool,
        resident_dependencies=payload.resident_dependencies,
        required_roles=payload.required_roles,
    )
