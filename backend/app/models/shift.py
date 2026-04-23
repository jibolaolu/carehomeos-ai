from dataclasses import dataclass


@dataclass
class Shift:
    id: str
    staff_id: str
    starts_at: str
    ends_at: str
    role: str
