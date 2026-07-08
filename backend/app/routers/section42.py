from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.safeguarding import (
    PaginatedResponse,
    Section42Generate,
    Section42Out,
    Section42Update,
)
from app.services.safeguarding.section42_generator import Section42Generator

router = APIRouter(prefix="/safeguarding/section42", tags=["section42"])


def _get_user(request: Request) -> dict[str, Any]:
    user = request.scope.get("state", {}).get("user") or {}
    if not user.get("care_home_id"):
        raise HTTPException(status_code=401, detail="Authenticated user required")
    return user


@router.post("/generate", response_model=Section42Out, status_code=201)
async def generate_section42(
    request: Request,
    payload: Section42Generate,
    db: AsyncSession = Depends(get_db),
) -> Section42Out:
    user = _get_user(request)
    generator = Section42Generator(db)
    enquiry = await generator.generate(
        care_home_id=str(user["care_home_id"]),
        case_id=payload.safeguarding_case_id,
        user_id=str(user.get("id", "local-manager")),
    )
    return Section42Out.model_validate(enquiry)


@router.get("", response_model=PaginatedResponse)
async def list_enquiries(
    request: Request,
    case_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    generator = Section42Generator(db)
    items, total = await generator.list_enquiries(
        care_home_id=str(user["care_home_id"]),
        case_id=case_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return {"items": [Section42Out.model_validate(i) for i in items], "total": total}


@router.get("/{enquiry_id}", response_model=Section42Out)
async def get_enquiry(
    enquiry_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Section42Out:
    user = _get_user(request)
    generator = Section42Generator(db)
    enquiry = await generator.get_enquiry(enquiry_id, str(user["care_home_id"]))
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return Section42Out.model_validate(enquiry)


@router.patch("/{enquiry_id}", response_model=Section42Out)
async def update_enquiry(
    enquiry_id: str,
    request: Request,
    payload: Section42Update,
    db: AsyncSession = Depends(get_db),
) -> Section42Out:
    user = _get_user(request)
    generator = Section42Generator(db)
    enquiry = await generator.get_enquiry(enquiry_id, str(user["care_home_id"]))
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    updated = await generator.update_enquiry(
        enquiry=enquiry,
        data=payload.model_dump(exclude_unset=True),
    )
    return Section42Out.model_validate(updated)
