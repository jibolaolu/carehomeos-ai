from dataclasses import dataclass


@dataclass
class Home:
    id: str
    name: str
    cqc_location_id: str
    nation: str = "england"
