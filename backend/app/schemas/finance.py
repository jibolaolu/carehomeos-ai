from pydantic import BaseModel


class FinanceSummary(BaseModel):
    occupancy: int
    monthly_revenue: int
    invoices_due: int
