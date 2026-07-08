from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.cqc_pack_generator import build_inspection_pack
from app.services.ai.mock_inspection import run_mock_inspection
from app.services.cqc_service import build_regulation_17_trail, get_cqc_snapshot, tag_quality_statement


router = APIRouter(prefix="/cqc", tags=["cqc"])


class TagRequest(BaseModel):
    note_type: str
    text: str = ""


class Regulation17Request(BaseModel):
    finding: str
    owner: str
    due: str


class InspectionPackRequest(BaseModel):
    home_id: str
    home_name: str
    evidence_summary: dict[str, object]


class MockInspectionRequest(BaseModel):
    home_id: str
    home_name: str
    evidence_summary: dict[str, object]


@router.get("/snapshot")
async def snapshot() -> dict[str, object]:
    return get_cqc_snapshot()


@router.post("/inspection-pack")
async def inspection_pack(payload: InspectionPackRequest) -> dict[str, object]:
    """Generate CQC inspection pack using GPT-4o."""
    return await build_inspection_pack(
        home_id=payload.home_id,
        home_name=payload.home_name,
        evidence_summary=payload.evidence_summary,
    )


@router.post("/mock-inspection")
async def mock_inspection(payload: MockInspectionRequest) -> dict[str, object]:
    """Run mock CQC inspection using Claude Sonnet."""
    return await run_mock_inspection(
        home_id=payload.home_id,
        home_name=payload.home_name,
        evidence_summary=payload.evidence_summary,
    )


@router.post("/tag")
async def tag_note(payload: TagRequest) -> dict[str, object]:
    return {"tags": tag_quality_statement(payload.note_type, payload.text)}


@router.post("/regulation-17")
async def regulation_17(payload: Regulation17Request) -> dict[str, object]:
    return build_regulation_17_trail(payload.finding, payload.owner, payload.due)
