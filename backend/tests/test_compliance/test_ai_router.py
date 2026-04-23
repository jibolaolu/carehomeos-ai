import asyncio

from app.routers.ai import CompletionRequest, ai_complete, ai_status
from app.services.llm_router import TaskType


def test_ai_status_exposes_multi_llm_routes():
    status = asyncio.run(ai_status())

    assert "openai" in status["providers"]
    assert "anthropic" in status["providers"]
    assert status["routing"]["care_note"]["primary"] == "claude-sonnet"


def test_ai_complete_uses_local_fallback_without_keys():
    result = asyncio.run(
        ai_complete(
            CompletionRequest(
                task_type=TaskType.STAFF_REPORT,
                prompt="Resident refused lunch and accepted fluids after prompting.",
            )
        )
    )

    assert result["provider"] == "deterministic-fallback"
    assert "Local CareHomeOS AI fallback" in result["text"]
