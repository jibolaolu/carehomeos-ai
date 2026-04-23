from app.services.payroll_service import build_payroll_export


def run() -> dict[str, object]:
    return build_payroll_export([{"staff": "Amelia Williams", "hours": 37.5}])
