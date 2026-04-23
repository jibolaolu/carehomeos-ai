from dataclasses import dataclass, field


@dataclass
class FallsRisk:
    resident_id: str
    score: int
    level: str
    factors: list[str] = field(default_factory=list)
