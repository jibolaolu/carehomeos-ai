from __future__ import annotations

import logging

from app.services.ai.core_ai_services import score_falls_risk as _score_falls_risk

logger = logging.getLogger(__name__)


async def score_falls_risk(
    resident: dict[str, object],
    notes: list[dict[str, object]] | None = None,
    medications: list[dict[str, object]] | None = None,
    incidents: list[dict[str, object]] | None = None,
    environment: dict[str, object] | None = None,
) -> dict[str, object]:
    """Calculate falls risk score using GPT-4o mini with real LLM analysis.

    This function replaces the previous rule-based stub and delegates to the
    real LLM-powered implementation in core_ai_services.py.
    """
    return await _score_falls_risk(
        resident=resident,
        notes=notes,
        medications=medications,
        incidents=incidents,
        environment=environment,
    )
