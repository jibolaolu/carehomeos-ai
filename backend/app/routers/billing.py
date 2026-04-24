from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.demo_data import CARE_HOMES, FINANCE, PLANS
from app.services.plan_rules import subscription_snapshot


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
    snapshot = subscription_snapshot(care_home_id)
    return {
        **snapshot,
        "payment_provider": "stripe-local-dev",
        "checkout_ready": True,
        "manage_billing_url": f"/api/v1/billing/portal?care_home_id={snapshot['care_home']['id']}",
    }


@router.post("/checkout-session")
async def checkout_session(care_home_id: str = "home-oakfield", plan_id: str = "professional") -> dict[str, object]:
    if not any(plan["id"] == plan_id for plan in PLANS):
        raise HTTPException(status_code=404, detail="Unknown plan")

    home = next((item for item in CARE_HOMES if item["id"] == care_home_id), CARE_HOMES[0])
    home["plan"] = plan_id
    matched_plan = next(plan for plan in PLANS if plan["id"] == plan_id)
    home["monthly_value_gbp"] = matched_plan["price_gbp"]
    home["subscription_status"] = "active"

    return {
        "status": "created",
        "mode": "subscription",
        "care_home_id": care_home_id,
        "plan_id": plan_id,
        "checkout_url": f"https://billing.carehomeos.local/checkout/{care_home_id}/{plan_id}",
        "subscription": subscription_snapshot(care_home_id),
    }
