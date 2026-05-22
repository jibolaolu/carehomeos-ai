from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Resident(Base):
    __tablename__ = "residents"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    care_home_id: Mapped[str] = mapped_column(
        ForeignKey("care_homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nhs_number: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    gp_practice_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gp_practice_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    title: Mapped[str | None] = mapped_column(String(20), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    preferred_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    room: Mapped[str] = mapped_column(String(50), nullable=False)
    admission_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    primary_need: Mapped[str] = mapped_column(Text, nullable=False)
    secondary_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    mobility: Mapped[str] = mapped_column(String(50), default="independent", nullable=False)
    falls_risk: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    deterioration_risk: Mapped[str] = mapped_column(String(20), default="low", nullable=False)
    hydration_status: Mapped[str] = mapped_column(String(20), default="stable", nullable=False)
    nutrition_status: Mapped[str] = mapped_column(String(20), default="stable", nullable=False)
    skin_condition: Mapped[str | None] = mapped_column(String(100), nullable=True)
    continence_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    communication_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    cognitive_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dnar_status: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    dietary_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    family_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    family_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    family_contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    family_contact_relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)
    next_of_kin_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    next_of_kin_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    lpa_health_welfare: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lpa_property_financial: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    care_plan_review_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_care_plan_review: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="residents")
    care_notes: Mapped[list["CareNote"]] = relationship("CareNote", back_populates="resident")
    medications: Mapped[list["Medication"]] = relationship("Medication", back_populates="resident")
    mar_records: Mapped[list["MARRecord"]] = relationship("MARRecord", back_populates="resident")
    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="resident")
    profile: Mapped["ResidentProfile"] = relationship(
        "ResidentProfile", back_populates="resident", uselist=False
    )
    wound_assessments: Mapped[list["WoundAssessment"]] = relationship(
        "WoundAssessment", back_populates="resident"
    )
    vital_signs: Mapped[list["VitalSigns"]] = relationship("VitalSigns", back_populates="resident")
    fluid_balances: Mapped[list["FluidBalance"]] = relationship("FluidBalance", back_populates="resident")
    catheter_stoma_records: Mapped[list["CatheterStomaRecord"]] = relationship(
        "CatheterStomaRecord", back_populates="resident"
    )
    end_of_life_care: Mapped["EndOfLifeCare"] = relationship(
        "EndOfLifeCare", back_populates="resident", uselist=False
    )
    nutrition_screenings: Mapped[list["NutritionScreening"]] = relationship(
        "NutritionScreening", back_populates="resident"
    )
