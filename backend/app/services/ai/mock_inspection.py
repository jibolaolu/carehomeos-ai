from __future__ import annotations

import logging

from app.services.ai.core_ai_services import run_mock_inspection as _run_mock_inspection

logger = logging.getLogger(__name__)


async def run_mock_inspection(
    home_id: str,
    home_name: str,
    evidence_summary: dict[str, object],
) -> dict[str, object]:
    """Run a mock CQC inspection using Claude Sonnet.

    This function replaces the previous stub that returned hardcoded data and
    delegates to the real LLM-powered implementation in core_ai_services.py.
    """
    return await _run_mock_inspection(
        home_id=home_id,
        home_name=home_name,
        evidence_summary=evidence_summary,
    )
