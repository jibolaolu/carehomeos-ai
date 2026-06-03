from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.api_key import ApiKey
from app.seed import USER_ID
from app.services.rate_limiter import hash_api_key

router = APIRouter(prefix="/developer", tags=["developer"])


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    scopes: list[str] = Field(default_factory=list)
    care_home_id: str
    user_id: str = USER_ID
    rate_limit_per_hour: int = 1000


@router.get("/api-keys")
async def list_api_keys(
    care_home_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        select(ApiKey).where(ApiKey.care_home_id == care_home_id).order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return {
        "items": [
            {
                "id": key.id,
                "name": key.name,
                "prefix": key.key_prefix,
                "scopes": key.scopes.split(",") if key.scopes else [],
                "createdAt": key.created_at.isoformat() if key.created_at else None,
                "lastUsedAt": key.last_used_at.isoformat() if key.last_used_at else None,
                "revoked": not key.is_active,
            }
            for key in keys
        ]
    }


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    raw_key = f"ch_live_{secrets.token_urlsafe(24)}"
    prefix = raw_key[:12]
    api_key = ApiKey(
        care_home_id=payload.care_home_id,
        user_id=payload.user_id,
        name=payload.name,
        key_prefix=prefix,
        key_hash=hash_api_key(raw_key),
        scopes=",".join(payload.scopes),
        rate_limit_per_hour=payload.rate_limit_per_hour,
        is_active=True,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return {
        "key": raw_key,
        "item": {
            "id": api_key.id,
            "name": api_key.name,
            "prefix": api_key.key_prefix,
            "scopes": payload.scopes,
            "createdAt": api_key.created_at.isoformat() if api_key.created_at else None,
            "revoked": False,
        },
    }


@router.post("/api-keys/{key_id}/revoke")
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.is_active = False
    api_key.revoked_at = datetime.now(timezone.utc)
    api_key.revoked_reason = "Revoked via dashboard"
    await db.commit()
    return {"status": "revoked", "id": key_id}
