from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.webhook_delivery import WebhookDelivery
from app.models.webhook_subscription import WebhookSubscription

settings = get_settings()

MAX_RETRIES = settings.webhook_max_retries
BASE_DELAY = settings.webhook_retry_delay_seconds


def generate_signature(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload."""
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def build_headers(payload: str, secret: str | None, event_type: str) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "CareHomeOS-Webhook/1.0",
        "X-Webhook-Event": event_type,
        "X-Webhook-Timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if secret:
        headers["X-Webhook-Signature"] = f"sha256={generate_signature(payload, secret)}"
    return headers


async def store_delivery_attempt(
    db: AsyncSession,
    subscription_id: str,
    event_type: str,
    payload: dict[str, Any],
    status: str,
    http_status_code: int | None = None,
    response_body: str | None = None,
    error_message: str | None = None,
    duration_ms: int | None = None,
    signature: str | None = None,
) -> WebhookDelivery:
    """Store a webhook delivery attempt in the database."""
    delivery = WebhookDelivery(
        subscription_id=subscription_id,
        event_type=event_type,
        payload=json.dumps(payload),
        status=status,
        http_status_code=http_status_code,
        response_body=response_body,
        error_message=error_message,
        duration_ms=duration_ms,
        signature=signature,
    )
    db.add(delivery)
    await db.commit()
    await db.refresh(delivery)
    return delivery


async def deliver_webhook(
    db: AsyncSession,
    subscription: WebhookSubscription,
    event_type: str,
    payload: dict[str, Any],
) -> WebhookDelivery:
    """Deliver a webhook with exponential backoff retry logic."""
    payload_json = json.dumps(payload, default=str)
    secret = subscription.secret
    headers = build_headers(payload_json, secret, event_type)
    signature = headers.get("X-Webhook-Signature")

    last_error: str | None = None
    last_status_code: int | None = None
    last_response: str | None = None
    start_time = time.time()

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    subscription.url,
                    content=payload_json,
                    headers=headers,
                )
            duration_ms = int((time.time() - start_time) * 1000)
            last_status_code = response.status_code
            last_response = response.text

            if response.status_code < 500:
                # Success or client error (don't retry 4xx)
                subscription.delivery_count += 1
                subscription.last_delivered_at = datetime.now(timezone.utc)
                await db.commit()

                return await store_delivery_attempt(
                    db=db,
                    subscription_id=subscription.id,
                    event_type=event_type,
                    payload=payload,
                    status="delivered" if response.status_code < 400 else "failed",
                    http_status_code=response.status_code,
                    response_body=response.text,
                    duration_ms=duration_ms,
                    signature=signature,
                )
            else:
                last_error = f"HTTP {response.status_code}"
        except httpx.TimeoutException:
            last_error = "Request timeout"
            last_status_code = None
        except httpx.ConnectError as exc:
            last_error = f"Connection error: {exc}"
            last_status_code = None
        except Exception as exc:
            last_error = str(exc)
            last_status_code = None

        if attempt < MAX_RETRIES:
            delay = BASE_DELAY * (2 ** (attempt - 1))
            await asyncio.sleep(delay)

    duration_ms = int((time.time() - start_time) * 1000)
    subscription.failure_count += 1
    await db.commit()

    return await store_delivery_attempt(
        db=db,
        subscription_id=subscription.id,
        event_type=event_type,
        payload=payload,
        status="failed",
        http_status_code=last_status_code,
        response_body=last_response,
        error_message=last_error,
        duration_ms=duration_ms,
        signature=signature,
    )


async def test_webhook_delivery(
    db: AsyncSession,
    subscription: WebhookSubscription,
) -> WebhookDelivery:
    """Send a test event to a webhook subscription."""
    test_payload = {
        "event": "webhook.test",
        "message": "This is a test delivery from CareHomeOS",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "subscription_id": subscription.id,
    }
    return await deliver_webhook(db, subscription, "webhook.test", test_payload)
