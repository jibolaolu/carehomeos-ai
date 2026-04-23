from dataclasses import dataclass, field


@dataclass
class Incident:
    id: str
    resident_id: str
    category: str
    severity: str
    actions: list[str] = field(default_factory=list)
