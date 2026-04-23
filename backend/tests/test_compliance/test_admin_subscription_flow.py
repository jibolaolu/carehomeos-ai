import asyncio

from app.demo_data import DEMO_USERS
from app.routers.admin import CreateUserRequest, create_user, platform_overview
from app.routers.auth import LoginRequest, login
from app.routers.billing import plans, subscription


def test_billing_plans_and_subscription_are_available():
    plan_list = asyncio.run(plans())
    current = asyncio.run(subscription("home-oakfield"))

    assert {plan["id"] for plan in plan_list} >= {"starter", "professional", "enterprise"}
    assert current["care_home"]["id"] == "home-oakfield"
    assert current["plan"]["id"] == "professional"


def test_seeded_super_admin_login_routes_to_platform_admin():
    response = asyncio.run(login(LoginRequest(email="superadmin@carehomeos.local", password="CareHomeOS!2026")))

    assert response["authenticated"] is True
    assert response["user"]["role"] == "super_admin"
    assert response["next"] == "/platform-admin"


def test_create_care_home_admin_for_e2e_scenario():
    email = "e2e.admin@oakfield.local"
    DEMO_USERS[:] = [user for user in DEMO_USERS if user["email"] != email]

    user = asyncio.run(
        create_user(
            CreateUserRequest(
                name="E2E Admin",
                email=email,
                role="care_home_admin",
                care_home_id="home-oakfield",
            )
        )
    )
    login_response = asyncio.run(login(LoginRequest(email=email, password="CareHomeOS!2026")))

    assert user["role"] == "care_home_admin"
    assert user["care_home_id"] == "home-oakfield"
    assert login_response["authenticated"] is True
    assert login_response["next"] == "/dashboard"


def test_seeded_staff_login_routes_to_reporting_entry():
    response = asyncio.run(login(LoginRequest(email="staff@oakfield.local", password="CareHomeOS!2026")))

    assert response["authenticated"] is True
    assert response["user"]["role"] == "staff"
    assert response["next"] == "/staff-reporting"


def test_platform_overview_counts_admin_roles():
    overview = asyncio.run(platform_overview())

    assert overview["metrics"]["active_homes"] >= 1
    assert overview["metrics"]["super_admins"] >= 1
    assert overview["metrics"]["care_home_admins"] >= 1
    assert overview["metrics"]["sub_admins"] >= 1
