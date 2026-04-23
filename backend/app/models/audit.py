from dataclasses import dataclass


@dataclass
class Audit:
    id: str
    name: str
    score: int | None
    status: str
    owner: str
