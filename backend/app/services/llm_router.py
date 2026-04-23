from __future__ import annotations

import asyncio
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

import anthropic
import openai

from app.config import get_settings


settings = get_settings()


class TaskType(StrEnum):
    CARE_NOTE = "care_note"
    FAMILY_UPDATE = "family_update"
    CARE_PLAN = "care_plan"
    MEDICATION_CHECK = "medication_check"
    DETERIORATION = "deterioration"
    FALLS = "falls"
    CQC_PACK = "cqc_pack"
    STAFF_REPORT = "staff_report"


ROUTING_TABLE: dict[TaskType, list[str]] = {
    TaskType.CARE_NOTE: ["claude-sonnet", "gpt-4o", "deterministic-fallback"],
    TaskType.FAMILY_UPDATE: ["claude-sonnet", "gpt-4o-mini", "deterministic-fallback"],
    TaskType.CARE_PLAN: ["gpt-4o", "claude-sonnet", "deterministic-fallback"],
    TaskType.MEDICATION_CHECK: ["gpt-4o", "claude-sonnet", "deterministic-fallback"],
    TaskType.DETERIORATION: ["claude-opus", "gpt-4o", "deterministic-fallback"],
    TaskType.FALLS: ["gpt-4o-mini", "gemini-flash", "claude-sonnet", "deterministic-fallback"],
    TaskType.CQC_PACK: ["gpt-4o", "claude-sonnet", "deterministic-fallback"],
    TaskType.STAFF_REPORT: ["gpt-4o-mini", "gemini-flash", "claude-sonnet", "deterministic-fallback"],
}


@dataclass
class LLMResult:
    text: str
    provider: str
    model: str
    fallback_used: bool
    attempts: list[dict[str, str]]


def route_task(task_type: TaskType) -> dict[str, object]:
    providers = ROUTING_TABLE[task_type]
    return {"task": task_type.value, "primary": providers[0], "fallback": providers[1:]}


def routing_table() -> dict[str, dict[str, object]]:
    return {task.value: route_task(task) for task in TaskType}


def provider_status() -> dict[str, dict[str, object]]:
    return {
        "anthropic": {
            "configured": bool(settings.anthropic_api_key),
            "models": [settings.anthropic_model, settings.anthropic_deep_model],
        },
        "openai": {
            "configured": bool(settings.openai_api_key),
            "models": [settings.openai_model, settings.openai_fast_model],
        },
        "gemini": {
            "configured": bool(settings.gemini_api_key),
            "models": [settings.gemini_model],
            "installed": _gemini_available(),
        },
        "deterministic-fallback": {"configured": True, "models": ["local-carehomeos-template"]},
    }


async def complete(task_type: TaskType, prompt: str, system: str = "") -> LLMResult:
    attempts: list[dict[str, str]] = []
    providers = ROUTING_TABLE[task_type]

    for provider in providers:
        try:
            if provider == "deterministic-fallback":
                return LLMResult(
                    text=_fallback_response(task_type, prompt),
                    provider=provider,
                    model="local-carehomeos-template",
                    fallback_used=provider != providers[0],
                    attempts=attempts,
                )

            text, model = await _call_provider(provider, prompt, system)
            return LLMResult(
                text=text,
                provider=provider,
                model=model,
                fallback_used=provider != providers[0],
                attempts=attempts,
            )
        except Exception as exc:
            attempts.append({"provider": provider, "error": str(exc)})

    return LLMResult(
        text=_fallback_response(task_type, prompt),
        provider="deterministic-fallback",
        model="local-carehomeos-template",
        fallback_used=True,
        attempts=attempts,
    )


async def _call_provider(provider: str, prompt: str, system: str) -> tuple[str, str]:
    if provider.startswith("claude"):
        return await _call_claude(provider, prompt, system)
    if provider.startswith("gemini"):
        return await _call_gemini(prompt, system)
    return await _call_openai(provider, prompt, system)


async def _call_claude(provider: str, prompt: str, system: str) -> tuple[str, str]:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    model = settings.anthropic_deep_model if provider == "claude-opus" else settings.anthropic_model
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model=model,
        max_tokens=1800,
        system=system or "You are a UK care-home assistant. Follow CQC expectations, UK GDPR, and write clearly for care teams.",
        messages=[{"role": "user", "content": prompt}],
    )
    content = response.content[0]
    return getattr(content, "text", str(content)), model


async def _call_openai(provider: str, prompt: str, system: str) -> tuple[str, str]:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    model = settings.openai_fast_model if provider == "gpt-4o-mini" else settings.openai_model
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system or "You are a UK care-home assistant. Keep outputs practical, auditable, and CQC-aware."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content or "", model


async def _call_gemini(prompt: str, system: str) -> tuple[str, str]:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    try:
        import google.generativeai as genai  # type: ignore
    except ImportError as exc:
        raise RuntimeError("google-generativeai is not installed") from exc

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(model_name=settings.gemini_model, system_instruction=system or None)
    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
    return response.text, settings.gemini_model


def _gemini_available() -> bool:
    try:
        import google.generativeai  # type: ignore  # noqa: F401
    except ImportError:
        return False
    return True


def _fallback_response(task_type: TaskType, prompt: str) -> str:
    task_name = task_type.value.replace("_", " ")
    prompt_preview = " ".join(prompt.split())[:240]
    return (
        f"Local CareHomeOS AI fallback for {task_name}.\n\n"
        f"Input considered: {prompt_preview}\n\n"
        "Draft outcome:\n"
        "- Record the care context, resident impact, staff action, and follow-up owner.\n"
        "- Add CQC evidence tags where the note touches Safe, Effective, Caring, Responsive, or Well-led.\n"
        "- Escalate immediately if the content suggests clinical deterioration, safeguarding concern, medication risk, or a fall."
    )


def result_to_dict(result: LLMResult) -> dict[str, Any]:
    return {
        "text": result.text,
        "provider": result.provider,
        "model": result.model,
        "fallback_used": result.fallback_used,
        "attempts": result.attempts,
    }
