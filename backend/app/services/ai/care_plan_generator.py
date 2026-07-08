from __future__ import annotations

import logging

from app.services.ai.core_ai_services import generate_care_plan as _generate_care_plan

logger = logging.getLogger(__name__)


async def generate_care_plan(
    resident: dict[str, object],
    assessment_data: dict[str, object],
    existing_plan: dict[str, object] | None = None,
) -> dict[str, object]:
    """Generate an AI-assisted care plan draft using Claude Sonnet.

    This function replaces the previous template-based stub and delegates to
    the real LLM-powered implementation in core_ai_services.py.
    """
    return await _generate_care_plan(
        resident=resident,
        assessment_data=assessment_data,
        existing_plan=existing_plan,
    )
