from __future__ import annotations

from datetime import date, datetime, timedelta, timezone


NOW = datetime(2026, 4, 22, 9, 30, tzinfo=timezone.utc)


RESIDENTS: list[dict[str, object]] = [
    {
        "id": "res-001",
        "name": "Margaret Ellis",
        "room": "12A",
        "age": 87,
        "mobility": "Frame with one-carer support",
        "primary_need": "Dementia care",
        "falls_risk": "high",
        "deterioration": "medium",
        "hydration": "watch",
        "family_contact": "Daniel Ellis",
        "care_plan_review": "2026-04-26",
    },
    {
        "id": "res-002",
        "name": "George Patel",
        "room": "7",
        "age": 79,
        "mobility": "Independent indoors",
        "primary_need": "Post-stroke rehabilitation",
        "falls_risk": "medium",
        "deterioration": "low",
        "hydration": "stable",
        "family_contact": "Anika Shah",
        "care_plan_review": "2026-05-03",
    },
    {
        "id": "res-003",
        "name": "Evelyn Morgan",
        "room": "21",
        "age": 92,
        "mobility": "Hoist transfer",
        "primary_need": "Nursing care",
        "falls_risk": "low",
        "deterioration": "high",
        "hydration": "concern",
        "family_contact": "Claire Morgan",
        "care_plan_review": "2026-04-24",
    },
]


CARE_NOTES: list[dict[str, object]] = [
    {
        "id": "note-1001",
        "resident_id": "res-001",
        "resident": "Margaret Ellis",
        "type": "nutrition",
        "summary": "Ate half of breakfast, accepted fortified drink, needed prompting with fluids.",
        "confidence": 0.82,
        "route": "SOFT_FLAG",
        "cqc_tags": ["Safe: managing risks", "Responsive: personalised care"],
        "recorded_by": "Amelia Williams",
        "recorded_role": "Senior carer",
        "created_at": (NOW - timedelta(minutes=18)).isoformat(),
    },
    {
        "id": "note-1002",
        "resident_id": "res-003",
        "resident": "Evelyn Morgan",
        "type": "skin",
        "summary": "Redness noted on left heel, pressure relief applied and senior nurse informed.",
        "confidence": 0.91,
        "route": "AUTO_FILE",
        "cqc_tags": ["Safe: managing risks", "Effective: monitoring outcomes"],
        "recorded_by": "Priya Nair",
        "recorded_role": "Nurse",
        "created_at": (NOW - timedelta(minutes=34)).isoformat(),
    },
    {
        "id": "note-1003",
        "resident_id": "res-002",
        "resident": "George Patel",
        "type": "mobility",
        "summary": "Transferred safely after lunch, walked to lounge with supervision and remained steady throughout.",
        "confidence": 0.88,
        "route": "AUTO_FILE",
        "cqc_tags": ["Safe: falls prevention", "Caring: independence supported"],
        "recorded_by": "Jon Clarke",
        "recorded_role": "Carer",
        "created_at": (NOW - timedelta(minutes=51)).isoformat(),
    },
    {
        "id": "note-1004",
        "resident_id": "res-001",
        "resident": "Margaret Ellis",
        "type": "family update",
        "summary": "Family requested update after lunch intake review; callback drafted for manager sign-off.",
        "confidence": 0.79,
        "route": "SOFT_FLAG",
        "cqc_tags": ["Responsive: family communication", "Well-led: oversight"],
        "recorded_by": "Devon Deputy",
        "recorded_role": "Assistant manager",
        "created_at": (NOW - timedelta(minutes=66)).isoformat(),
    },
]


MEDICATION_ROUND: list[dict[str, object]] = [
    {
        "resident": "Margaret Ellis",
        "room": "12A",
        "medication": "Memantine 10mg",
        "time": "08:00",
        "status": "administered",
        "recorded_by": "A. Williams",
    },
    {
        "resident": "George Patel",
        "room": "7",
        "medication": "Amlodipine 5mg",
        "time": "08:00",
        "status": "administered",
        "recorded_by": "J. Clarke",
    },
    {
        "resident": "Evelyn Morgan",
        "room": "21",
        "medication": "Paracetamol 1g PRN",
        "time": "10:00",
        "status": "due",
        "recorded_by": None,
    },
]


INCIDENTS: list[dict[str, object]] = [
    {
        "id": "inc-401",
        "resident": "Margaret Ellis",
        "type": "Unwitnessed fall",
        "severity": "high",
        "status": "RCA in progress",
        "reported_at": (NOW - timedelta(days=1, hours=3)).isoformat(),
        "actions": ["Post-fall observations", "Family notified", "Falls plan review"],
    },
    {
        "id": "inc-402",
        "resident": "Evelyn Morgan",
        "type": "Pressure area concern",
        "severity": "medium",
        "status": "Senior review booked",
        "reported_at": (NOW - timedelta(hours=6)).isoformat(),
        "actions": ["Tissue viability referral", "Repositioning schedule"],
    },
]


STAFF: list[dict[str, object]] = [
    {"name": "Amelia Williams", "role": "Senior carer", "shift": "07:30-15:30", "training": 96},
    {"name": "Jon Clarke", "role": "Carer", "shift": "07:30-15:30", "training": 88},
    {"name": "Priya Nair", "role": "Nurse", "shift": "08:00-20:00", "training": 100},
    {"name": "Sam Brooks", "role": "Carer", "shift": "14:00-22:00", "training": 81},
]


CQC_SNAPSHOT: dict[str, object] = {
    "overall": 87,
    "last_refreshed": NOW.isoformat(),
    "key_questions": [
        {"name": "Safe", "score": 82, "evidence": 46, "risk": "Medication omissions and falls learning"},
        {"name": "Effective", "score": 89, "evidence": 33, "risk": "Capacity reviews due this week"},
        {"name": "Caring", "score": 93, "evidence": 28, "risk": "Family feedback sample is thin"},
        {"name": "Responsive", "score": 84, "evidence": 31, "risk": "Complaint closure evidence needed"},
        {"name": "Well-led", "score": 86, "evidence": 52, "risk": "Regulation 17 action owners"},
    ],
    "actions": [
        {"owner": "Registered manager", "action": "Close audit action for pressure care", "due": "2026-04-24"},
        {"owner": "Clinical lead", "action": "Review falls prevention plans for high-risk residents", "due": "2026-04-25"},
        {"owner": "Deputy manager", "action": "Upload governance meeting minutes", "due": "2026-04-26"},
    ],
}


FINANCE: dict[str, object] = {
    "occupancy": 94,
    "monthly_revenue": 186400,
    "invoices_due": 9,
    "la_batch_value": 74200,
    "self_funder_value": 112200,
    "next_payroll_export": date(2026, 4, 30).isoformat(),
}


PLANS: list[dict[str, object]] = [
    {
        "id": "starter",
        "name": "Starter",
        "price_gbp": 299,
        "billing_interval": "month",
        "resident_limit": 35,
        "admin_limit": 2,
        "features": [
            "Core resident dashboard",
            "Care notes and CQC evidence tagging",
            "Medication round visibility",
        ],
    },
    {
        "id": "professional",
        "name": "Professional",
        "price_gbp": 699,
        "billing_interval": "month",
        "resident_limit": 90,
        "admin_limit": 8,
        "highlight": True,
        "features": [
            "Everything in Starter",
            "AI note quality gate and family update drafting",
            "Finance exports and rota gap alerts",
            "Multilingual voice-note translation metadata",
        ],
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price_gbp": 1499,
        "billing_interval": "month",
        "resident_limit": "unlimited",
        "admin_limit": "unlimited",
        "features": [
            "Multi-home portfolio oversight",
            "Super admin controls and audit event export",
            "Dedicated onboarding and custom integrations",
        ],
    },
]


CARE_HOMES: list[dict[str, object]] = [
    {
        "id": "home-oakfield",
        "name": "Oakfield House",
        "provider": "Nestiq Care Group",
        "plan": "professional",
        "subscription_status": "trialing",
        "trial_ends": "2026-05-06",
        "residents": 43,
        "admins": 2,
        "cqc_score": 87,
        "monthly_value_gbp": 699,
    },
    {
        "id": "home-lakeview",
        "name": "Lakeview Manor",
        "provider": "Nestiq Care Group",
        "plan": "starter",
        "subscription_status": "active",
        "trial_ends": None,
        "residents": 28,
        "admins": 1,
        "cqc_score": 81,
        "monthly_value_gbp": 299,
    },
]


DEMO_USERS: list[dict[str, object]] = [
    {
        "id": "usr-super-001",
        "name": "Sofia Platform",
        "email": "superadmin@carehomeos.local",
        "role": "super_admin",
        "platform_scope": "carehomeos_company",
        "care_home_id": None,
        "status": "active",
        "password": "CareHomeOS!2026",
    },
    {
        "id": "usr-admin-001",
        "name": "Ruth Manager",
        "email": "manager@oakfield.local",
        "role": "care_home_admin",
        "care_home_id": "home-oakfield",
        "care_home_name": "Oakfield House",
        "status": "active",
        "password": "CareHomeOS!2026",
    },
    {
        "id": "usr-admin-002",
        "name": "Devon Deputy",
        "email": "deputy@oakfield.local",
        "role": "sub_admin",
        "admin_level": "assistant_manager",
        "care_home_id": "home-oakfield",
        "care_home_name": "Oakfield House",
        "status": "invited",
        "password": "CareHomeOS!2026",
    },
    {
        "id": "usr-staff-001",
        "name": "Amelia Williams",
        "email": "staff@oakfield.local",
        "role": "staff",
        "care_home_id": "home-oakfield",
        "care_home_name": "Oakfield House",
        "status": "active",
        "password": "CareHomeOS!2026",
    },
    # CQC Assistant demo accounts
    {
        "id": "usr-manager-demo-001",
        "name": "Demo Manager",
        "email": "manager@demo.com",
        "role": "care_home_admin",
        "care_home_id": "home-demo",
        "care_home_name": "Demo Care Home Ltd",
        "status": "active",
        "password": "DemoManager123!",
    },
    {
        "id": "usr-admin-demo-001",
        "name": "Demo Admin",
        "email": "admin@demo.com",
        "role": "super_admin",
        "platform_scope": "carehomeos_company",
        "care_home_id": None,
        "status": "active",
        "password": "DemoAdmin123!",
    },
    {
        "id": "usr-staff-demo-001",
        "name": "Demo Staff",
        "email": "staff@demo.com",
        "role": "staff",
        "care_home_id": "home-demo",
        "care_home_name": "Demo Care Home Ltd",
        "status": "active",
        "password": "DemoStaff123!",
    },
]
