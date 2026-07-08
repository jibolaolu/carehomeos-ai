from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.safeguarding import EvidencePackCreate, EvidencePackOut, PaginatedResponse
from app.services.safeguarding.evidence_pack import EvidencePackService

router = APIRouter(prefix="/safeguarding/evidence-packs", tags=["evidence-packs"])


def _get_user(request: Request) -> dict[str, Any]:
    user = request.scope.get("state", {}).get("user") or {}
    if not user.get("care_home_id"):
        raise HTTPException(status_code=401, detail="Authenticated user required")
    return user


@router.post("", response_model=EvidencePackOut, status_code=201)
async def create_pack(
    request: Request,
    payload: EvidencePackCreate,
    db: AsyncSession = Depends(get_db),
) -> EvidencePackOut:
    user = _get_user(request)
    service = EvidencePackService(db)
    pack = await service.create_pack(
        care_home_id=str(user["care_home_id"]),
        safeguarding_case_id=payload.safeguarding_case_id,
        user_id=str(user.get("id", "local-manager")),
        data=payload.model_dump(),
    )
    return EvidencePackOut.model_validate(pack)


@router.post("/{pack_id}/generate", response_model=EvidencePackOut)
async def generate_pack(
    pack_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EvidencePackOut:
    user = _get_user(request)
    service = EvidencePackService(db)
    pack = await service.get_pack(pack_id, str(user["care_home_id"]))
    if not pack:
        raise HTTPException(status_code=404, detail="Evidence pack not found")
    generated = await service.generate_pack(pack)
    return EvidencePackOut.model_validate(generated)


@router.get("/{pack_id}/download")
async def download_pack(
    pack_id: str,
    request: Request,
    format: str = "zip",
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    service = EvidencePackService(db)
    pack = await service.get_pack(pack_id, str(user["care_home_id"]))
    if not pack:
        raise HTTPException(status_code=404, detail="Evidence pack not found")
    if pack.status != "completed":
        raise HTTPException(status_code=400, detail="Evidence pack not ready")

    from app.config import get_settings
    settings = get_settings()
    key = pack.s3_key_zip if format == "zip" else pack.s3_key_pdf
    if not key:
        raise HTTPException(status_code=400, detail="Requested format not available")

    import boto3
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.aws_region,
    )
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": pack.s3_bucket, "Key": key},
        ExpiresIn=300,
    )
    return {"download_url": url, "expires_in_seconds": 300}


@router.get("/{pack_id}", response_model=EvidencePackOut)
async def get_pack(
    pack_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EvidencePackOut:
    user = _get_user(request)
    service = EvidencePackService(db)
    pack = await service.get_pack(pack_id, str(user["care_home_id"]))
    if not pack:
        raise HTTPException(status_code=404, detail="Evidence pack not found")
    return EvidencePackOut.model_validate(pack)


@router.get("", response_model=PaginatedResponse)
async def list_packs(
    request: Request,
    case_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    service = EvidencePackService(db)
    items, total = await service.list_packs(
        care_home_id=str(user["care_home_id"]),
        case_id=case_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return {"items": [EvidencePackOut.model_validate(i) for i in items], "total": total}
