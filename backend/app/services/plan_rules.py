from __future__ import annotations

from app.config import get_settings
from app.demo_data import CARE_HOMES, PLANS

settings = get_settings()


def enforce_resident_limit(care_home_id: str, current_count: int = 0) -> None:
    """Enforce resident limit based on subscription tier."""
    # In production, look up care_home subscription tier from database
    # For now, use a simple check
    if current_count >= settings.free_tier_max_residents:
        raise ValueError(
            f"Free tier limit reached ({settings.free_tier_max_residents} residents). "
            "Upgrade to Professional tier."
        )


def check_free_tier_care_note_limit(notes_today: int) -> bool:
    """Check if care note limit exceeded for free tier."""
    return notes_today < settings.free_tier_max_care_notes_per_day


def calculate_group_pricing(base_price: float, home_count: int) -> float:
    """Calculate group pricing with progressive discount."""
    if home_count <= 1:
        return base_price
    discount = min(settings.group_discount_rate * (home_count - 1), 0.60)
    return base_price * (1 - discount)


def calculate_ri_discount(monthly_price: float, months: int = 6) -> dict[str, float]:
    """Calculate 'Requires Improvement' discount pricing."""
    discount_amount = monthly_price * settings.ri_discount_rate
    discounted_monthly = monthly_price - discount_amount
    total_savings = discount_amount * min(months, settings.ri_discount_months)
    return {
        "original_monthly": monthly_price,
        "discounted_monthly": discounted_monthly,
        "discount_rate": settings.ri_discount_rate,
        "discount_months": min(months, settings.ri_discount_months),
        "total_savings": total_savings,
    }


def calculate_trial_end_date(start_date: str) -> str:
    """Calculate trial end date."""
    from datetime import datetime, timedelta
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end = start + timedelta(days=settings.trial_days)
    return end.isoformat()


def is_feature_available(tier: str, feature: str) -> bool:
    """Check if a feature is available for a subscription tier."""
    tier_features = {
        "free": [
            "basic_care_notes",
            "daily_logs",
            "resident_profiles",
            "family_portal",
        ],
        "professional": [
            "basic_care_notes",
            "daily_logs",
            "resident_profiles",
            "family_portal",
            "ai_care_notes",
            "emar",
            "cqc_tools",
            "incident_tracking",
            "staff_management",
            "rota",
            "offline_mode",
            "api_access",
        ],
        "enterprise": [
            "basic_care_notes",
            "daily_logs",
            "resident_profiles",
            "family_portal",
            "ai_care_notes",
            "emar",
            "cqc_tools",
            "incident_tracking",
            "staff_management",
            "rota",
            "offline_mode",
            "api_access",
            "nursing_clinical",
            "group_reporting",
            "pharmacy_integration",
            "custom_branding",
            "dedicated_support",
        ],
    }
    return feature in tier_features.get(tier, [])


TIER_PRICING = {
    "free": {
        "monthly_price": 0.0,
        "per_resident_price": 0.0,
        "max_residents": 5,
        "max_staff": 3,
        "features": ["basic_care_notes", "daily_logs", "resident_profiles", "family_portal"],
    },
    "professional": {
        "monthly_price": 199.0,
        "per_resident_price": 0.0,
        "max_residents": 100,
        "max_staff": 50,
        "features": [
            "basic_care_notes",
            "ai_care_notes",
            "emar",
            "cqc_tools",
            "incident_tracking",
            "staff_management",
            "rota",
            "offline_mode",
            "api_access",
        ],
    },
    "enterprise": {
        "monthly_price": 399.0,
        "per_resident_price": 0.0,
        "max_residents": 500,
        "max_staff": 200,
        "features": [
            "basic_care_notes",
            "ai_care_notes",
            "emar",
            "cqc_tools",
            "incident_tracking",
            "staff_management",
            "rota",
            "offline_mode",
            "api_access",
            "nursing_clinical",
            "group_reporting",
            "pharmacy_integration",
            "custom_branding",
            "dedicated_support",
        ],
    },
}


def get_tier_details(tier: str) -> dict[str, object]:
    """Get full details for a subscription tier."""
    return TIER_PRICING.get(tier, TIER_PRICING["free"])


def subscription_snapshot(care_home_id: str) -> dict[str, object]:
    """Build a subscription snapshot for a care home."""
    home = next((item for item in CARE_HOMES if item["id"] == care_home_id), None)
    if home is None:
        home = CARE_HOMES[0]

    plan = next((p for p in PLANS if p["id"] == home.get("plan", "starter")), PLANS[0])

    resident_limit = plan.get("resident_limit", 35)
    admin_limit = plan.get("admin_limit", 2)
    residents = home.get("residents", 0)
    admins = home.get("admins", 0)

    return {
        "care_home": {
            "id": home["id"],
            "name": home["name"],
            "provider": home.get("provider", ""),
        },
        "plan": {
            "id": plan["id"],
            "name": plan["name"],
            "price_gbp": plan["price_gbp"],
            "billing_interval": plan.get("billing_interval", "month"),
        },
        "limits": {
            "residents": resident_limit if isinstance(resident_limit, int) else None,
            "admins": admin_limit if isinstance(admin_limit, int) else None,
        },
        "usage": {
            "residents": residents,
            "admins": admins,
        },
        "status": home.get("subscription_status", "trialing"),
        "trial_ends": home.get("trial_ends"),
        "monthly_value_gbp": home.get("monthly_value_gbp", plan["price_gbp"]),
    }
