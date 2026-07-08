from __future__ import annotations

import logging

from app.services.ai.core_ai_services import analyse_incident as _analyse_incident

logger = logging.getLogger(__name__)


async def analyse_incident(
    incident: dict[str, object],
    related_notes: list[dict[str, object]] | None = None,
    previous_incidents: list[dict[str, object]] | None = None,
    resident: dict[str, object] | None = None,
) -> dict[str, object]:
    """Analyse an incident for root causes and required actions using Claude Opus.

    This function replaces the previous severity-check stub and delegates to
    the real LLM-powered implementation in core_ai_services.py.
    """
    return await _analyse_incident(
        incident=incident,
        related_notes=related_notes,
        previous_incidents=previous_incidents,
        resident=resident,
    )
