from dataclasses import dataclass


@dataclass
class CarePlan:
    id: str
    resident_id: str
    domain: str
    review_due: str
    owner: str
