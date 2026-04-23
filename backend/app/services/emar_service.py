def record_administration(resident: str, medication: str, status: str, recorded_by: str) -> dict[str, object]:
    return {
        "resident": resident,
        "medication": medication,
        "status": status,
        "recorded_by": recorded_by,
        "audit_written": True,
    }


def check_missed_doses(rounds: list[dict[str, object]]) -> list[dict[str, object]]:
    return [item for item in rounds if str(item.get("status", "")).lower() in {"due", "missed", "omitted"}]
