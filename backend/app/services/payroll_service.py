def build_payroll_export(staff_hours: list[dict[str, object]]) -> dict[str, object]:
    total_hours = sum(float(item.get("hours", 0)) for item in staff_hours)
    return {"format": "sage_csv", "rows": staff_hours, "total_hours": total_hours}
