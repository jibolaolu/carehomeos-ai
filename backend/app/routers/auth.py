from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.demo_data import DEMO_USERS
from app.logging_config import log_auth


router = APIRouter(prefix="/auth", tags=["auth"])


ROLE_NEXT_ROUTE = {
    "super_admin": "/platform-admin",
    "care_home_admin": "/dashboard",
    "sub_admin": "/dashboard",
    "staff": "/staff-reporting",
}


class LoginRequest(BaseModel):
    email: str
    password: str


@router.get("/me")
async def me() -> dict[str, object]:
    return {
        "id": "local-manager",
        "name": "Local Registered Manager",
        "roles": ["registered_manager", "clinical_lead"],
        "auth_mode": "local-development",
    }


@router.get("/demo-users")
async def demo_users() -> list[dict[str, object]]:
    return DEMO_USERS


@router.post("/login")
async def login(payload: LoginRequest) -> dict[str, object]:
    user = next((item for item in DEMO_USERS if item["email"] == payload.email.strip().lower()), None)
    if not user or user["password"] != payload.password:
        return {"authenticated": False, "message": "Invalid local demo credentials"}

    # Emit [AuthService] line on every successful sign-in
    log_auth(
        sub=str(user["id"]),
        email=str(user["email"]),
        role=str(user["role"]),
        care_home_id=str(user.get("care_home_id") or ""),
        care_home_name=str(user.get("care_home_name") or ""),
    )

    # Return sanitized user (no password)
    safe_user = {k: v for k, v in user.items() if k != "password"}

    return {
        "authenticated": True,
        "token": f"local-demo-token:{user['id']}",
        "user": safe_user,
        "next": ROLE_NEXT_ROUTE.get(str(user["role"]), "/dashboard"),
    }
