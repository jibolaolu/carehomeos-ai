"""
CareHomeOS API entry point.

setup_logging() MUST be called before any other import that touches the
logging module — that is why it is the very first thing after stdlib imports.
"""
import asyncio
import logging
import time
from contextlib import asynccontextmanager

# ── NestJS-style logging — wire up before anything else ──────────────────────
from app.logging_config import (  # noqa: E402
    setup_logging,
    _GREEN, _BOLD, _DIM, _RESET, _YELLOW, _CYAN,
)
setup_logging(debug=False)
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import init_db
from app.middleware.auth import LocalAuthMiddleware
from app.middleware.request_log import RequestLogMiddleware
from app.routers import public_api
from app.routers.registry import api_router
from app.services.runtime_status import get_service_status

settings = get_settings()
logger = logging.getLogger(__name__)

# ── Router registry — displayed in the startup banner ────────────────────────
_ROUTER_REGISTRY = [
    (api_router, settings.api_v1_prefix, "APIRouter"),
    (public_api.router, settings.public_api_prefix, "PublicAPIRouter"),
]

# Fine-grained router names pulled from the sub-routers
_SUBROUTER_MAP = [
    ("/api/v1/residents",           "ResidentsRouter"),
    ("/api/v1/staff",               "StaffRouter"),
    ("/api/v1/incidents",           "IncidentsRouter"),
    ("/api/v1/mar",                 "EMarRouter"),
    ("/api/v1/shift-notes",         "ShiftNotesRouter"),
    ("/api/v1/cqc",                 "CQCRouter"),
    ("/api/v1/rota",                "RotaRouter"),
    ("/api/v1/care-notes",          "CareNotesRouter"),
    ("/api/v1/clinical/vitals",     "VitalsRouter"),
    ("/api/v1/clinical/fluids",     "FluidsRouter"),
    ("/api/v1/clinical/wounds",     "WoundsRouter"),
    ("/api/v1/clinical/nutrition",  "NutritionRouter"),
    ("/api/v1/clinical/eol",        "EoLRouter"),
    ("/api/v1/clinical/catheter-stoma", "CatheterRouter"),
    ("/api/v1/reports",             "ReportsRouter"),
    ("/api/v1/safeguarding",        "SafeguardingRouter"),
    ("/api/v1/safeguarding/section42", "Section42Router"),
    ("/api/v1/safeguarding/patterns", "PatternsRouter"),
    ("/api/v1/safeguarding/evidence-packs", "EvidencePacksRouter"),
    ("/api/v1/billing",             "BillingRouter"),
    ("/api/v1/admin",               "AdminRouter"),
    ("/api/v1/onboarding",          "OnboardingRouter"),
    ("/api/v1/webhooks",            "WebhooksRouter"),
    ("/api/v1/developer",           "DeveloperRouter"),
    ("/api/v1/auth",                "AuthRouter"),
]


@asynccontextmanager
async def lifespan(_: FastAPI):
    boot_start = time.perf_counter()

    # ── Banner ─────────────────────────────────────────────────────────────────
    bar = "─" * 56
    env = settings.app_env
    env_colour = _YELLOW if env != "production" else _GREEN
    logger.info(bar, extra={"context": "Bootstrap"})
    logger.info(
        "CareHomeOS API  %sv1.0.0%s   %s%s%s",
        _BOLD, _RESET,
        env_colour, env.upper(), _RESET,
        extra={"context": "Bootstrap"},
    )
    logger.info(bar, extra={"context": "Bootstrap"})

    # ── Config summary ─────────────────────────────────────────────────────────
    db_display = (
        settings.database_url.split("@")[-1]
        if "@" in settings.database_url
        else settings.database_url
    )
    logger.info(
        "Port %s%s%s  ·  DB %s%s%s  ·  Redis %s%s%s",
        _GREEN, settings.app_port, _RESET,
        _GREEN, db_display, _RESET,
        _GREEN, settings.redis_url, _RESET,
        extra={"context": "Config"},
    )
    logger.info(
        "AI enabled=%s  model=%s%s%s  ·  Auth0 %s%s%s",
        settings.enable_ai_features,
        _CYAN, settings.anthropic_model, _RESET,
        _CYAN, settings.auth0_domain or "not configured", _RESET,
        extra={"context": "Config"},
    )

    # ── Database init ──────────────────────────────────────────────────────────
    db_start = time.perf_counter()
    try:
        await init_db()
        db_ms = round((time.perf_counter() - db_start) * 1000, 1)
        logger.info(
            "PostgreSQL connection established  +%.0fms", db_ms,
            extra={"context": "Database"},
        )
    except Exception as exc:
        logger.warning(
            "Database initialisation skipped: %s", exc,
            extra={"context": "Database"},
        )

    # ── Route map ──────────────────────────────────────────────────────────────
    for prefix, ctx in _SUBROUTER_MAP:
        logger.info(
            "Mapped %s%s%s",
            _CYAN, prefix, _RESET,
            extra={"context": "RouterExplorer"},
        )

    # ── Ready ──────────────────────────────────────────────────────────────────
    total_ms = round((time.perf_counter() - boot_start) * 1000)
    logger.info(
        "Application running on: %shttp://0.0.0.0:%s%s  +%dms",
        _GREEN, settings.app_port, _RESET, total_ms,
        extra={"context": "Bootstrap"},
    )
    logger.info(
        "Detailed request log enabled — %s[HTTP]%s + %s[AuditLog]%s per request\n",
        _YELLOW, _RESET, _YELLOW, _RESET,
        extra={"context": "Bootstrap"},
    )

    yield

    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("Shutting down gracefully…", extra={"context": "Bootstrap"})


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
    redirect_slashes=False,
)


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "%s %s → %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc,
        exc_info=True,
        extra={"context": "ExceptionHandler"},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check backend logs for details."},
    )


# ── Middleware stack ──────────────────────────────────────────────────────────
# Starlette builds the stack in reverse add_middleware order, so the LAST call
# here becomes the outermost wrapper (first to see each request).
#
# Effective request order:
#   CORS → RequestLog (start timer) → LocalAuth (emit [AuthService]) → routes
#
# 1. LocalAuth — innermost; resolves user, injects x-user-id, emits [AuthService]
app.add_middleware(LocalAuthMiddleware)

# 2. Request logging — times everything incl. auth; emits [HTTP] + [AuditLog]
app.add_middleware(RequestLogMiddleware, is_production=(settings.app_env == "production"))

# 3. CORS — outermost
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(public_api.router, prefix=settings.public_api_prefix)


# ── Core endpoints ────────────────────────────────────────────────────────────
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
    return {"ready": all(services.values()), "services": services}


@app.get(f"{settings.api_v1_prefix}/meta")
async def meta() -> dict[str, object]:
    return {
        "default_nation": settings.default_nation,
        "ai_enabled": settings.enable_ai_features,
        "aws_region": settings.aws_region,
        "public_api_base_url": settings.public_api_base_url,
        "public_dashboard_url": settings.public_dashboard_url,
        "services": ["api", "database", "redis", "s3-compatible-storage"],
        "routes": [prefix for prefix, _ in _SUBROUTER_MAP],
    }
