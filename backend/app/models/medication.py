from __future__ import annotations

import uuid
from datetime import date, time

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    resident_id: Mapped[str] = mapped_column(
        ForeignKey("residents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    strength: Mapped[str] = mapped_column(String(100), nullable=False)
    form: Mapped[str] = mapped_column(String(50), nullable=False)
    route: Mapped[str] = mapped_column(String(50), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    prescribed_dose: Mapped[str] = mapped_column(String(100), nullable=False)
    max_daily_dose: Mapped[str | None] = mapped_column(String(100), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    indications: Mapped[str | None] = mapped_column(Text, nullable=True)
    side_effects_to_monitor: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_controlled_drug: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    controlled_drug_schedule: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_prn: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    prn_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    prn_max_daily: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_covert: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    covert_authorisation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    covert_review_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    prescribed_by: Mapped[str] = mapped_column(String(200), nullable=False)
    prescribed_date: Mapped[date] = mapped_column(Date, nullable=False)
    review_date: Mapped[date] = mapped_column(Date, nullable=False)
    pharmacy_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pharmacy_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    discontinued_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    discontinued_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ai_interaction_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_interaction_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="medications")
    mar_records: Mapped[list["MARRecord"]] = relationship("MARRecord", back_populates="medication")
