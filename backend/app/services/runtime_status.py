"""
CareHomeOS runtime service-health checker.

Two public surfaces:

  get_service_status()  → dict[str, bool]
      Simple boolean map used by /health and /ready endpoints.
      Backward-compatible — callers that only need ok/not-ok use this.

  get_service_detail()  → dict[str, ServiceDetail]
      Rich map used by /admin/platform-overview.
      Each entry includes: ok, latency_ms, region.
      An extra synthetic "api" entry is always ok=True (we are responding,
      therefore the API gateway is up).

Timing is measured around each real I/O call so the latency shown in the
platform-admin infra-health cards is accurate even when a service is down.
"""
from __future__ import annotations

import asyncio
import time
from typing import TypedDict
from urllib.parse import urlparse

from app.config import get_settings

settings = get_settings()


class ServiceDetail(TypedDict):
    ok: bool
    latency_ms: float
    region: str


# ── Individual checks ─────────────────────────────────────────────────────────

async def _check_database() -> ServiceDetail:
    from app.db import check_db_connection
    t0 = time.perf_counter()
    try:
        ok = await check_db_connection()
    except Exception:
        ok = False
    return ServiceDetail(
        ok=ok,
        latency_ms=round((time.perf_counter() - t0) * 1000, 1),
        region="uk-south-1",
    )


async def _check_redis() -> ServiceDetail:
    from redis.asyncio import Redis
    t0 = time.perf_counter()
    try:
        client = Redis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True, socket_timeout=2
        )
        ok = bool(await asyncio.wait_for(client.ping(), timeout=2))
        await client.aclose()
    except Exception:
        ok = False
    return ServiceDetail(
        ok=ok,
        latency_ms=round((time.perf_counter() - t0) * 1000, 1),
        region="uk-south-1",
    )


def _check_s3() -> ServiceDetail:
    import boto3
    t0 = time.perf_counter()
    try:
        parsed = urlparse(settings.s3_endpoint_url)
        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name="us-east-1",
        )
        client.list_buckets()
        ok = parsed.scheme in {"http", "https"}
    except Exception:
        ok = False
    return ServiceDetail(
        ok=ok,
        latency_ms=round((time.perf_counter() - t0) * 1000, 1),
        region="global-cdn",
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def get_service_detail() -> dict[str, ServiceDetail]:
    """
    Rich health data for the platform-admin infra cards.

    Runs database and redis checks concurrently; S3 is synchronous (boto3
    doesn't have a proper async client) so it is run last.

    The synthetic ``api`` entry is always ok=True — the endpoint returning
    this data proves the API gateway is alive.
    """
    db_result, redis_result = await asyncio.gather(
        _check_database(),
        _check_redis(),
    )
    s3_result = _check_s3()

    return {
        "api":      ServiceDetail(ok=True,                latency_ms=1.0, region="uk-south-1"),
        "database": db_result,
        "redis":    redis_result,
        "s3":       s3_result,
    }


async def get_service_status() -> dict[str, bool]:
    """
    Simple boolean map — backward compatible with /health and /ready.
    Derives from get_service_detail() so there is a single source of truth.
    """
    detail = await get_service_detail()
    return {name: svc["ok"] for name, svc in detail.items() if name != "api"}
