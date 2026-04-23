from datetime import datetime, timezone


def write_audit_log(actor_id: str, action: str, resource: str) -> dict[str, str]:
    return {
        "actor_id": actor_id,
        "action": action,
        "resource": resource,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
