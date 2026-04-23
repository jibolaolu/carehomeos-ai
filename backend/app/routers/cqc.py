from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.cqc_pack_generator import build_inspection_pack
from app.services.cqc_service import build_regulation_17_trail, get_cqc_snapshot, tag_quality_statement


router = APIRouter(prefix="/cqc", tags=["cqc"])


class TagRequest(BaseModel):
    note_type: str
    text: str = ""


class Regulation17Request(BaseModel):
    finding: str
    owner: str
    due: str


@router.get("/snapshot")
async def snapshot() -> dict[str, object]:
    return get_cqc_snapshot()


@router.get("/inspection-pack")
async def inspection_pack() -> dict[str, object]:
    return build_inspection_pack()


@router.post("/tag")
async def tag_note(payload: TagRequest) -> dict[str, object]:
    return {"tags": tag_quality_statement(payload.note_type, payload.text)}


@router.post("/regulation-17")
async def regulation_17(payload: Regulation17Request) -> dict[str, object]:
    return build_regulation_17_trail(payload.finding, payload.owner, payload.due)
