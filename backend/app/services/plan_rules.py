from __future__ import annotations

from typing import Any

from app.demo_data import CARE_HOMES, DEMO_USERS, PLANS, RESIDENTS


PLAN_FEATURE_FLAGS: dict[str, dict[str, bool]] = {
    "starter": {
        "portfolio_controls": False,
        "finance_exports": False,
        "ai_note_quality_gate": False,
        "rota_gap_alerts": False,
        "super_admin_audit": False,
        "custom_integrations": False,
        "multilingual_voice_notes": False,
    },
    "professional": {
        "portfolio_controls": False,
        "finance_exports": True,
        "ai_note_quality_gate": True,
        "rota_gap_alerts": True,
        "super_admin_audit": False,
        "custom_integrations": False,
        "multilingual_voice_notes": True,
    },
    "enterprise": {
        "portfolio_controls": True,
        "finance_exports": True,
        "ai_note_quality_gate": True,
        "rota_gap_alerts": True,
        "super_admin_audit": True,
        "custom_integrations": True,
        "multilingual_voice_notes": True,
    },
}


def _find_home(care_home_id: str) -> dict[str, Any]:
    return next((item for item in CARE_HOMES if item["id"] == care_home_id), CARE_HOMES[0])


def _find_plan(plan_id: str) -> dict[str, Any]:
    return next((item for item in PLANS if item["id"] == plan_id), PLANS[0])


def _limit_value(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.lower() == "unlimited":
        return None
    return int(value)


def _admin_usage(care_home_id: str) -> int:
    scoped_admin_roles = {"care_home_admin", "sub_admin"}
    return sum(
        1
        for user in DEMO_USERS
        if user.get("care_home_id") == care_home_id and user.get("role") in scoped_admin_roles
    )


def _resident_usage(care_home_id: str) -> int:
    home = _find_home(care_home_id)
    explicit = home.get("residents")
    if isinstance(explicit, int) and explicit > len(RESIDENTS):
        return explicit
    return len(RESIDENTS)


def subscription_snapshot(care_home_id: str = "home-oakfield") -> dict[str, Any]:
    home = _find_home(care_home_id)
    plan = _find_plan(str(home["plan"]))
    resident_limit = _limit_value(plan["resident_limit"])
    admin_limit = _limit_value(plan["admin_limit"])
    resident_usage = _resident_usage(care_home_id)
    admin_usage = _admin_usage(care_home_id)

    return {
        "care_home": home,
        "plan": plan,
        "usage": {
            "residents": resident_usage,
            "admins": admin_usage,
        },
        "limits": {
            "residents": resident_limit,
            "admins": admin_limit,
        },
        "remaining": {
            "residents": None if resident_limit is None else max(resident_limit - resident_usage, 0),
            "admins": None if admin_limit is None else max(admin_limit - admin_usage, 0),
        },
        "feature_flags": PLAN_FEATURE_FLAGS.get(str(plan["id"]), {}),
    }


def enforce_resident_limit(care_home_id: str = "home-oakfield") -> None:
    snapshot = subscription_snapshot(care_home_id)
    limit = snapshot["limits"]["residents"]
    usage = snapshot["usage"]["residents"]
    if limit is not None and usage >= limit:
        raise ValueError(f"Resident limit reached for the {snapshot['plan']['name']} plan ({usage}/{limit}). Upgrade the plan before adding more residents.")


def enforce_admin_limit(care_home_id: str = "home-oakfield") -> None:
    snapshot = subscription_snapshot(care_home_id)
    limit = snapshot["limits"]["admins"]
    usage = snapshot["usage"]["admins"]
    if limit is not None and usage >= limit:
        raise ValueError(f"Admin limit reached for the {snapshot['plan']['name']} plan ({usage}/{limit}). Upgrade the plan before inviting another admin.")
