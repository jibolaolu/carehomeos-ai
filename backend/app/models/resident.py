from dataclasses import dataclass


@dataclass
class Resident:
    id: str
    home_id: str
    name: str
    room: str
    status: str = "active"
