from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.llm_router import TaskType, complete, provider_status, result_to_dict, routing_table


router = APIRouter(prefix="/ai", tags=["ai"])


class CompletionRequest(BaseModel):
    task_type: TaskType = TaskType.CARE_NOTE
    prompt: str
    system: str = ""


@router.get("/status")
async def ai_status() -> dict[str, object]:
    return {"providers": provider_status(), "routing": routing_table()}


@router.post("/complete")
async def ai_complete(payload: CompletionRequest) -> dict[str, object]:
    if not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")

    result = await complete(payload.task_type, payload.prompt, payload.system)
    return result_to_dict(result)
