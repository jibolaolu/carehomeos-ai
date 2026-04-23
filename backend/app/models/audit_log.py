from dataclasses import dataclass


@dataclass(frozen=True)
class AuditLog:
    actor_id: str
    action: str
    resource: str
    created_at: str
