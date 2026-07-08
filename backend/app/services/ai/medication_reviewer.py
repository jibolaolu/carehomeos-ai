from __future__ import annotations

import logging

from app.services.ai.core_ai_services import review_medications as _review_medications

logger = logging.getLogger(__name__)


async def review_medications(
    resident: dict[str, object],
    medications: list[dict[str, object]],
    mar_history: list[dict[str, object]] | None = None,
    recent_notes: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    """Review medications for interactions, deprescribing, and adherence using GPT-4o.

    This function replaces the previous hardcoded interaction-check stub and
    delegates to the real LLM-powered implementation in core_ai_services.py.
    """
    return await _review_medications(
        resident=resident,
        medications=medications,
        mar_history=mar_history,
        recent_notes=recent_notes,
    )
