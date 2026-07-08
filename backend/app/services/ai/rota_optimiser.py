from __future__ import annotations

import logging

from app.services.ai.core_ai_services import generate_optimal_rota as _generate_optimal_rota

logger = logging.getLogger(__name__)


async def optimise_rota(
    home_id: str,
    shift_date: str,
    shift_type: str,
    staff_pool: list[dict[str, object]],
    resident_dependencies: dict[str, int],
    required_roles: list[str],
) -> dict[str, object]:
    """Generate an optimal rota using GPT-4o mini constraint-solving.

    This function replaces the previous simple coverage-check stub and delegates
    to the real LLM-powered implementation in core_ai_services.py.
    """
    return await _generate_optimal_rota(
        home_id=home_id,
        shift_date=shift_date,
        shift_type=shift_type,
        staff_pool=staff_pool,
        resident_dependencies=resident_dependencies,
        required_roles=required_roles,
    )
