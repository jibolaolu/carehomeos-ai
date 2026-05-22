from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class EndOfLifeCare(Base):
    __tablename__ = "end_of_life_care"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    resident_id: Mapped[str] = mapped_column(
        ForeignKey("residents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    eol_care_plan_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    eol_care_plan_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimated_prognosis: Mapped[str | None] = mapped_column(String(200), nullable=True)
    preferred_place_of_death: Mapped[str | None] = mapped_column(String(200), nullable=True)
    dnar_in_place: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dnar_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    dnar_discussed_with_resident: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dnar_discussed_with_family: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dnar_discussed_with_gp: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dnar_document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    advance_decision_to_refuse_treatment: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    adrt_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    adrt_document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lpa_health_welfare_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    lpa_health_welfare_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    coordinate_my_care_registered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cmc_plan_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    anticipatory_prescribing_in_place: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    just_in_case_medications: Mapped[str | None] = mapped_column(Text, nullable=True)
    symptom_management_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    spiritual_support_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    family_support_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    bereavement_support_offered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    gp_visits_frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district_nurse_involved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    specialist_palliative_care_involved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    chaplaincy_involved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="end_of_life_care")
