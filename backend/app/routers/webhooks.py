from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.webhook_delivery import WebhookDelivery
from app.models.webhook_subscription import WebhookSubscription
from app.services.webhook_delivery import test_webhook_delivery

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class SubscriptionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    secret: str | None = Field(None, max_length=255)
    events: list[str] = Field(default_factory=list)
    headers: dict[str, str] | None = None
    retry_policy: str = "exponential"
    max_retries: int = 5


class SubscriptionRead(BaseModel):
    id: str
    care_home_id: str
    name: str
    url: str
    events: list[str]
    is_active: bool
    created_at: str
    last_delivered_at: str | None
    delivery_count: int
    failure_count: int
    retry_policy: str
    max_retries: int

    class Config:
        from_attributes = True


@router.post("/subscriptions", status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: SubscriptionCreate,
    care_home_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    subscription = WebhookSubscription(
        care_home_id=care_home_id,
        name=payload.name,
        url=payload.url,
        secret=payload.secret,
        events=",".join(payload.events),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        headers=str(payload.headers) if payload.headers else None,
        retry_policy=payload.retry_policy,
        max_retries=payload.max_retries,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return {
        "id": subscription.id,
        "care_home_id": subscription.care_home_id,
        "name": subscription.name,
        "url": subscription.url,
        "events": subscription.events.split(",") if subscription.events else [],
        "is_active": subscription.is_active,
        "created_at": subscription.created_at.isoformat() if subscription.created_at else None,
        "retry_policy": subscription.retry_policy,
        "max_retries": subscription.max_retries,
    }


@router.get("/subscriptions")
async def list_subscriptions(
    care_home_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(WebhookSubscription).where(WebhookSubscription.care_home_id == care_home_id)
    )
    subs = result.scalars().all()
    return [
        {
            "id": s.id,
            "care_home_id": s.care_home_id,
            "name": s.name,
            "url": s.url,
            "events": s.events.split(",") if s.events else [],
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_delivered_at": s.last_delivered_at.isoformat() if s.last_delivered_at else None,
            "delivery_count": s.delivery_count,
            "failure_count": s.failure_count,
            "retry_policy": s.retry_policy,
            "max_retries": s.max_retries,
        }
        for s in subs
    ]


@router.delete(
    "/subscriptions/{subscription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_subscription(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WebhookSubscription).where(WebhookSubscription.id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    await db.delete(sub)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/deliveries")
async def list_deliveries(
    subscription_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    stmt = select(WebhookDelivery)
    if subscription_id:
        stmt = stmt.where(WebhookDelivery.subscription_id == subscription_id)
    if status:
        stmt = stmt.where(WebhookDelivery.status == status)

    count_result = await db.execute(stmt)
    total = len(count_result.scalars().all())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    deliveries = result.scalars().all()

    items = [
        {
            "id": d.id,
            "subscription_id": d.subscription_id,
            "event_type": d.event_type,
            "status": d.status,
            "http_status_code": d.http_status_code,
            "attempt_count": d.attempt_count,
            "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None,
            "failed_at": d.failed_at.isoformat() if d.failed_at else None,
            "error_message": d.error_message,
            "duration_ms": d.duration_ms,
        }
        for d in deliveries
    ]
    return {
        "data": items,
        "meta": {"total": total, "page": page, "page_size": page_size},
    }


@router.post("/test")
async def test_webhook(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        select(WebhookSubscription).where(WebhookSubscription.id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")

    delivery = await test_webhook_delivery(db, sub)
    return {
        "delivery_id": delivery.id,
        "status": delivery.status,
        "http_status_code": delivery.http_status_code,
        "error_message": delivery.error_message,
        "duration_ms": delivery.duration_ms,
    }
