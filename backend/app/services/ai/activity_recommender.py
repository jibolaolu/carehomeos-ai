from __future__ import annotations

import logging

from app.services.ai.core_ai_services import recommend_activities as _recommend_activities

logger = logging.getLogger(__name__)


async def recommend_activities(
    resident: dict[str, object],
    care_plan: dict[str, object] | None = None,
    recent_activities: list[dict[str, object]] | None = None,
    current_mood: str | None = None,
    weather: str | None = None,
    day_of_week: str | None = None,
) -> dict[str, object]:
    """Generate personalised activity recommendations using Claude Sonnet.

    This function replaces the previous keyword-matching stub and delegates to
    the real LLM-powered implementation in core_ai_services.py.
    """
    return await _recommend_activities(
        resident=resident,
        care_plan=care_plan,
        recent_activities=recent_activities,
        current_mood=current_mood,
        weather=weather,
        day_of_week=day_of_week,
    )
