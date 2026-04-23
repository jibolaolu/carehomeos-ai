from pydantic import BaseModel


class AdministrationCreate(BaseModel):
    resident: str
    medication: str
    status: str
    recorded_by: str
