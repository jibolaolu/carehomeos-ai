from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.demo_data import CARE_HOMES, DEMO_USERS


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
        raise HTTPException(status_code=400, detail="role must be care_home_admin, sub_admin, staff, or super_admin")

    if payload.role in scoped_roles and not payload.care_home_id:
        raise HTTPException(status_code=400, detail="care_home_id is required for care-home scoped users")

    if any(user["email"] == email for user in DEMO_USERS):
        raise HTTPException(status_code=409, detail="A demo user with this email already exists")

    user = {
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
    active_homes = [home for home in CARE_HOMES if home["subscription_status"] in {"active", "trialing"}]
    return {
        "care_homes": CARE_HOMES,
        "users": DEMO_USERS,
        "metrics": {
            "active_homes": len(active_homes),
            "trialing_homes": sum(1 for home in CARE_HOMES if home["subscription_status"] == "trialing"),
            "monthly_recurring_revenue_gbp": sum(int(home["monthly_value_gbp"]) for home in active_homes),
            "super_admins": sum(1 for user in DEMO_USERS if user["role"] == "super_admin"),
            "care_home_admins": sum(1 for user in DEMO_USERS if user["role"] == "care_home_admin"),
            "sub_admins": sum(1 for user in DEMO_USERS if user["role"] == "sub_admin"),
            "staff_users": sum(1 for user in DEMO_USERS if user["role"] == "staff"),
        },
    }
