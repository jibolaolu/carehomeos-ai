from __future__ import annotations

import logging

from app.services.ai.core_ai_services import generate_family_update as _generate_family_update

logger = logging.getLogger(__name__)


async def generate_family_update(
    resident: dict[str, object],
    note_summary: str,
    recent_activities: list[str] | None = None,
    mood: str | None = None,
) -> dict[str, object]:
    """Generate a warm, plain-English family update using Claude Sonnet.

    This function replaces the previous template-based stub and delegates to the
    real LLM-powered implementation in core_ai_services.py.
    """
    return await _generate_family_update(
        resident=resident,
        note_summary=note_summary,
        recent_activities=recent_activities,
        mood=mood,
    )
