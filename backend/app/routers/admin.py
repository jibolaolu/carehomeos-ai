from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.demo_data import CARE_HOMES, DEMO_USERS
from app.services.plan_rules import subscription_snapshot
from app.services.runtime_status import get_service_detail


router = APIRouter(prefix="/admin", tags=["admin"])


class CreateUserRequest(BaseModel):
    name: str
    email: str
    role: str = "care_home_admin"
    care_home_id: str | None = "home-oakfield"
    admin_level: str | None = None


@router.get("/care-homes")
async def list_care_homes() -> list[dict[str, object]]:
    return CARE_HOMES


@router.get("/users")
async def list_users() -> list[dict[str, object]]:
    return DEMO_USERS


@router.post("/users", status_code=201)
async def create_user(payload: CreateUserRequest) -> dict[str, object]:
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="email must be valid")

    scoped_roles = {"care_home_admin", "sub_admin", "staff"}
    valid_roles = scoped_roles | {"super_admin"}
    if payload.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail="role must be care_home_admin, sub_admin, staff, or super_admin",
        )

    if payload.role in scoped_roles and not payload.care_home_id:
        raise HTTPException(
            status_code=400,
            detail="care_home_id is required for care-home scoped users",
        )

    if any(user["email"] == email for user in DEMO_USERS):
        raise HTTPException(
            status_code=409,
            detail="A demo user with this email already exists",
        )

    if payload.role in {"care_home_admin", "sub_admin"} and payload.care_home_id:
        snapshot = subscription_snapshot(payload.care_home_id)
        admin_limit = snapshot["limits"]["admins"]
        admin_usage = snapshot["usage"]["admins"]
        if admin_limit is not None and admin_usage >= admin_limit:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Admin limit reached for the {snapshot['plan']['name']} plan "
                    f"({admin_usage}/{admin_limit}). Upgrade the plan before inviting another admin."
                ),
            )

    user: dict[str, object] = {
        "id": f"usr-{uuid4().hex[:8]}",
        "name": payload.name.strip(),
        "email": email,
        "role": payload.role,
        "admin_level": payload.admin_level if payload.role in {"care_home_admin", "sub_admin"} else None,
        "care_home_id": payload.care_home_id if payload.role in scoped_roles else None,
        "status": "invited",
        "password": "CareHomeOS!2026",
    }
    DEMO_USERS.append(user)
    return user


@router.get("/platform-overview")
async def platform_overview() -> dict[str, object]:
    active_homes = [
        home for home in CARE_HOMES
        if home["subscription_status"] in {"active", "trialing"}
    ]

    # Run all health checks once; derive the legacy boolean map from the
    # rich detail so there is a single source of truth.
    service_detail = await get_service_detail()
    # "api" entry is always ok; exclude it from the backward-compat bool map.
    services = {name: svc["ok"] for name, svc in service_detail.items() if name != "api"}

    subscriptions = [subscription_snapshot(home["id"]) for home in CARE_HOMES]

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        # Simple boolean map (backward compat — used by /health endpoint)
        "services": services,
        # Rich map with ok, latency_ms, region per service (includes "api")
        "service_detail": service_detail,
        "care_homes": CARE_HOMES,
        "users": DEMO_USERS,
        "subscriptions": subscriptions,
        "metrics": {
            "active_homes": len(active_homes),
            "trialing_homes": sum(
                1 for home in CARE_HOMES if home["subscription_status"] == "trialing"
            ),
            "monthly_recurring_revenue_gbp": sum(
                int(home["monthly_value_gbp"]) for home in active_homes
            ),
            "super_admins":       sum(1 for u in DEMO_USERS if u["role"] == "super_admin"),
            "care_home_admins":   sum(1 for u in DEMO_USERS if u["role"] == "care_home_admin"),
            "sub_admins":         sum(1 for u in DEMO_USERS if u["role"] == "sub_admin"),
            "staff_users":        sum(1 for u in DEMO_USERS if u["role"] == "staff"),
        },
    }
