from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.routers import (
    admin,
    ai,
    audits,
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
    onboarding,
    pharmacy,
    public_api,
    reports,
    residents,
    rota,
    staff,
    webhooks,
)
from app.routers.clinical import (
    catheter_stoma,
    eol,
    fluids,
    nutrition,
    vitals,
    wounds,
)
from app.services.runtime_status import get_service_status

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

# Internal API routers
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
    webhooks.router,
    reports.router,
    onboarding.router,
    pharmacy.router,
    # Clinical routers
    wounds.router,
    vitals.router,
    fluids.router,
    catheter_stoma.router,
    eol.router,
    nutrition.router,
):
    app.include_router(api_router, prefix=settings.api_v1_prefix)

# Public API router (separate auth, no prefix needed as it's in the router)
app.include_router(public_api.router, prefix=settings.public_api_prefix)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "environment": settings.app_env,
        "status": "ok",
        "dashboard_url": settings.public_dashboard_url,
        "public_api_docs": f"{settings.public_api_base_url}/docs",
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
            "/api/v1/clinical/wounds",
            "/api/v1/clinical/vitals",
            "/api/v1/clinical/fluids",
            "/api/v1/clinical/catheter-stoma",
            "/api/v1/clinical/eol",
            "/api/v1/clinical/nutrition",
            "/api/v1/reports/group-dashboard",
            "/api/v1/reports/cqc-pir",
            "/api/v1/onboarding/progress",
            "/api/v1/pharmacy/integrations",
            "/api/v1/webhooks/subscriptions",
            "/api/v1/public/residents",
            "/api/v1/public/care-notes",
        ],
    }
