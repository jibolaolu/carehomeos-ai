from dataclasses import dataclass, field


@dataclass
class DeteriorationAlert:
    resident_id: str
    level: str
    score: float
    actions: list[str] = field(default_factory=list)
