from dataclasses import dataclass, field


@dataclass
class ResidentProfile:
    resident_id: str
    primary_need: str
    mobility: str
    risks: list[str] = field(default_factory=list)
