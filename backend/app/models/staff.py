from dataclasses import dataclass


@dataclass
class Staff:
    id: str
    home_id: str
    name: str
    role: str
    training_compliance: int
