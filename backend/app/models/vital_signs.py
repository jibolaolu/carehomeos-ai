from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class VitalSigns(Base):
    __tablename__ = "vital_signs"

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
    recorded_by_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    systolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    diastolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pulse_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    respiration_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spo2_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spo2_on_o2: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    o2_flow_rate: Mapped[float | None] = mapped_column(String(10), nullable=True)
    temperature_celsius: Mapped[float | None] = mapped_column(String(10), nullable=True)
    blood_glucose_mmol: Mapped[float | None] = mapped_column(String(10), nullable=True)
    consciousness_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pain_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(String(10), nullable=True)
    news2_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    news2_risk_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    news2_escalation_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    escalation_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    escalation_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalation_completed_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_offline_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="vital_signs")
