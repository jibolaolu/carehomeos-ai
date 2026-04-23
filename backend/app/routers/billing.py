from __future__ import annotations

from fastapi import APIRouter

from app.demo_data import CARE_HOMES, FINANCE, PLANS


router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/invoices")
async def invoices() -> dict[str, object]:
    return {
        "due_count": FINANCE["invoices_due"],
        "la_batch_value": FINANCE["la_batch_value"],
        "self_funder_value": FINANCE["self_funder_value"],
    }


@router.get("/plans")
async def plans() -> list[dict[str, object]]:
    return PLANS


@router.get("/subscription")
async def subscription(care_home_id: str = "home-oakfield") -> dict[str, object]:
    home = next((item for item in CARE_HOMES if item["id"] == care_home_id), CARE_HOMES[0])
    plan = next((item for item in PLANS if item["id"] == home["plan"]), PLANS[0])
    return {
        "care_home": home,
        "plan": plan,
        "payment_provider": "stripe-local-dev",
        "checkout_ready": True,
        "manage_billing_url": f"/api/v1/billing/portal?care_home_id={home['id']}",
    }


@router.post("/checkout-session")
async def checkout_session(care_home_id: str = "home-oakfield", plan_id: str = "professional") -> dict[str, object]:
    if not any(plan["id"] == plan_id for plan in PLANS):
        return {"status": "error", "message": "Unknown plan"}

    return {
        "status": "created",
        "mode": "subscription",
        "care_home_id": care_home_id,
        "plan_id": plan_id,
        "checkout_url": f"https://billing.carehomeos.local/checkout/{care_home_id}/{plan_id}",
    }
