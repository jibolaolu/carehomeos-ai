from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.demo_data import DEMO_USERS


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

    return {
        "authenticated": True,
        "token": f"local-demo-token:{user['id']}",
        "user": user,
        "next": ROLE_NEXT_ROUTE.get(str(user["role"]), "/dashboard"),
    }
