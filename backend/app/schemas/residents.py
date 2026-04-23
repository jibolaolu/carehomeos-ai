from pydantic import BaseModel


class ResidentOut(BaseModel):
    id: str
    name: str
    room: str
    age: int
    primary_need: str
