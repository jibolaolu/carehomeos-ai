"""Aggregate internal API routers to avoid FastAPI lifespan nesting issues."""

from fastapi import APIRouter

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
    developer,
    falls,
    family,
    finance,
    incidents,
    mar,
    onboarding,
    pharmacy,
    reports,
    residents,
    rota,
    shift_notes,
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

api_router = APIRouter()

for router in (
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
    shift_notes.router,
    finance.router,
    billing.router,
    family.router,
    audits.router,
    cqc.router,
    deterioration.router,
    falls.router,
    webhooks.router,
    developer.router,
    reports.router,
    onboarding.router,
    pharmacy.router,
    wounds.router,
    vitals.router,
    fluids.router,
    catheter_stoma.router,
    eol.router,
    nutrition.router,
):
    api_router.include_router(router)
