
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import boto3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from app.config import get_settings
from app.db import check_db_connection, init_db
from app.routers import (
    audits,
    admin,
    ai,
    auth,
    billing,
    care_notes,
    care_plans,
    cqc,
    deterioration,
    falls,
    family,
    finance,
    incidents,
    mar,
    residents,
    rota,
    staff,
)


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for api_router in (
    auth.router,
    admin.router,
    ai.router,
    residents.router,
    care_notes.router,
    care_plans.router,
    mar.router,
    incidents.router,
    staff.router,
    rota.router,
    finance.router,
    billing.router,
    family.router,
    audits.router,
    cqc.router,
    deterioration.router,
    falls.router,
):
    app.include_router(api_router, prefix=settings.api_v1_prefix)


async def check_redis_connection() -> bool:
    client = Redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
    try:
        return bool(await client.ping())
    except Exception:
        return False
    finally:
        await client.aclose()


def check_s3_connection() -> bool:
    try:
        parsed_url = urlparse(settings.s3_endpoint_url)
        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name="us-east-1",
        )
        client.list_buckets()
        return parsed_url.scheme in {"http", "https"}
    except Exception:
        return False


async def get_service_status() -> dict[str, bool]:
    return {
        "database": await check_db_connection(),
        "redis": await check_redis_connection(),
        "s3": check_s3_connection(),
    }


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "environment": settings.app_env,
        "status": "ok",
        "dashboard_url": settings.public_dashboard_url,
    }


@app.get("/health")
async def health() -> dict[str, object]:
    services = await get_service_status()
    status = "healthy" if all(services.values()) else "degraded"
    return {"status": status, "services": services}


@app.get("/ready")
async def ready() -> dict[str, object]:
    services = await get_service_status()
    return {
        "ready": all(services.values()),
        "services": services,
    }


@app.get(f"{settings.api_v1_prefix}/meta")
async def meta() -> dict[str, object]:
    return {
        "default_nation": settings.default_nation,
        "ai_enabled": settings.enable_ai_features,
        "aws_region": settings.aws_region,
        "public_api_base_url": settings.public_api_base_url,
        "public_dashboard_url": settings.public_dashboard_url,
        "services": ["api", "database", "redis", "s3-compatible-storage"],
        "routes": [
            "/api/v1/residents",
            "/api/v1/care-notes",
            "/api/v1/billing/plans",
            "/api/v1/billing/subscription",
            "/api/v1/admin/users",
            "/api/v1/admin/platform-overview",
            "/api/v1/mar/rounds/today",
            "/api/v1/cqc/snapshot",
            "/api/v1/deterioration/scan",
            "/api/v1/falls/risk-score",
        ],
    }
