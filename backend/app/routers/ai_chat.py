"""
CareHomeOS AI Assistant Chat Router
=====================================
Streaming (SSE) and buffered AI chat for the global assistant panel.
Context-aware: knows the user's role, care home, and current page.
"""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import anthropic
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import get_settings
from app.middleware.auth import _resolve_user
from app.services.llm_router import TaskType, complete, result_to_dict

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/ai/chat", tags=["ai-chat"])


# ── Request/response models ───────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatContext(BaseModel):
    role: str = "care_home_admin"
    careHomeName: str = "the care home"
    page: str = "/dashboard"
    residentName: str | None = None
    pageContext: str = ""


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: ChatContext = ChatContext()


# ── System prompt ─────────────────────────────────────────────────────────────

def _build_system_prompt(context: ChatContext) -> str:
    page_hints: dict[str, str] = {
        "/dashboard":        "The user is on the main care home dashboard overview.",
        "/residents":        "The user is managing or reviewing resident records.",
        "/mar":              "The user is administering medications from the MAR chart.",
        "/incidents":        "The user is recording or reviewing incident reports.",
        "/cqc":              "The user is working on CQC compliance evidence.",
        "/rota":             "The user is managing staff rotas and shift cover.",
        "/safeguarding":     "The user is handling a safeguarding concern.",
        "/clinical/vitals":  "The user is recording vital signs and NEWS2 observations.",
        "/clinical/wounds":  "The user is documenting wound care.",
        "/clinical/fluids":  "The user is tracking fluid intake/output.",
        "/clinical/nutrition": "The user is recording nutrition and MUST assessments.",
        "/clinical/eol":     "The user is supporting end-of-life care planning.",
        "/shift-notes":      "The user is recording shift notes via voice or text.",
        "/finance":          "The user is reviewing financial records.",
        "/reports":          "The user is generating compliance or operational reports.",
    }
    page_hint = next(
        (v for k, v in page_hints.items() if context.page.startswith(k)),
        context.pageContext or "",
    )
    resident_ctx = (
        f"The current resident in focus is: {context.residentName}. "
        "Tailor advice to this resident where relevant."
        if context.residentName
        else ""
    )
    role_label = context.role.replace("_", " ").title()

    return f"""You are CareHomeOS, the intelligent AI assistant built into the CareHomeOS care management platform.
You are currently assisting a {role_label} at {context.careHomeName}.
{page_hint}
{resident_ctx}

You expertly assist with:
- Care note writing following CQC documentation standards and person-first language
- CQC Single Assessment Framework (Safe, Effective, Caring, Responsive, Well-led)
- Resident risk assessment: falls, clinical deterioration, pressure damage, nutrition, hydration
- Safeguarding Adults: Adult at Risk identification, Section 42 enquiries, DoLS, MCA 2005
- Medication management, MAR charts, PRN protocols, CD register
- NEWS2 scoring and clinical escalation pathways (SBAR)
- Rota planning, staffing ratios, and shift cover
- Care Act 2014, Mental Health Act 1983, UK GDPR, Caldicott principles
- CQC PIR, Regulation 17 governance, and inspection preparation
- Finance, payroll, and regulatory fee structures

Response rules:
- Be concise and practical for frontline care staff
- Use bullet points for action lists and numbered steps for procedures
- Prefix safeguarding concerns with: 🔴 SAFEGUARDING ALERT
- Prefix urgent clinical issues with: 🟠 CLINICAL CONCERN
- Use UK English and standard care home terminology (not US spellings)
- State clearly when you don't know something — never invent clinical facts
- Always recommend contacting a GP, district nurse, or manager for clinical decisions
- If the user describes something that sounds like abuse or neglect, always flag it clearly"""


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("")
async def chat(
    payload: ChatRequest,
    current_user: dict = Depends(_resolve_user),
) -> dict:
    """Buffered AI chat — returns full response in one payload."""
    system = _build_system_prompt(payload.context)

    # Build conversation history for context (last 6 turns)
    history_lines: list[str] = []
    for msg in payload.messages[:-1][-6:]:
        prefix = "User" if msg.role == "user" else "Assistant"
        history_lines.append(f"{prefix}: {msg.content}")
    last_user_msg = payload.messages[-1].content if payload.messages else ""
    full_prompt = ("\n".join(history_lines) + f"\nUser: {last_user_msg}") if history_lines else last_user_msg

    result = await complete(TaskType.CARE_NOTE, full_prompt, system)
    return {**result_to_dict(result), "context": payload.context.model_dump()}


@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    current_user: dict = Depends(_resolve_user),
) -> StreamingResponse:
    """Server-Sent Events streaming — yields tokens as they arrive from Claude."""
    system = _build_system_prompt(payload.context)
    messages = [{"role": m.role, "content": m.content} for m in payload.messages[-10:]]

    # If Anthropic key not configured, fall back to buffered SSE
    if not settings.anthropic_api_key:
        last_msg = payload.messages[-1].content if payload.messages else ""
        result = await complete(TaskType.CARE_NOTE, last_msg, system)
        text = result_to_dict(result).get("text", "AI unavailable — please configure ANTHROPIC_API_KEY.")

        async def _buffered() -> AsyncIterator[str]:
            yield f"data: {json.dumps({'delta': text, 'done': False})}\n\n"
            yield f"data: {json.dumps({'delta': '', 'done': True})}\n\n"

        return StreamingResponse(_buffered(), media_type="text/event-stream")

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def _stream() -> AsyncIterator[str]:
        try:
            async with client.messages.stream(
                model=settings.anthropic_model,
                max_tokens=1024,
                system=system,
                messages=messages,
            ) as stream:
                async for chunk in stream.text_stream:
                    yield f"data: {json.dumps({'delta': chunk, 'done': False})}\n\n"
            yield f"data: {json.dumps({'delta': '', 'done': True})}\n\n"
        except Exception as exc:
            logger.error("Chat stream error: %s", exc, exc_info=True)
            yield f"data: {json.dumps({'error': str(exc), 'done': True})}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
