def analyse_incident(incident: dict[str, object]) -> dict[str, object]:
    severity = str(incident.get("severity", "medium")).lower()
    return {
        "severity": severity,
        "root_cause_prompts": ["environment", "staffing", "equipment", "care plan accuracy"],
        "requires_manager_review": severity in {"high", "critical"},
    }
