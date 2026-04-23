from dataclasses import dataclass


@dataclass
class Medication:
    id: str
    resident_id: str
    name: str
    dose: str
    route: str
    controlled_schedule: int | None = None
