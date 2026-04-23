from dataclasses import dataclass, field


@dataclass
class CareNote:
    id: str
    resident_id: str
    note_type: str
    summary: str
    route: str
    cqc_tags: list[str] = field(default_factory=list)
