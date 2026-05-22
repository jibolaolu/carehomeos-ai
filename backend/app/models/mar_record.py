from __future__ import annotations

import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class MARRecord(Base):
    __tablename__ = "mar_records"

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
    medication_id: Mapped[str] = mapped_column(
        ForeignKey("medications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    administered_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    scheduled_time: Mapped[time] = mapped_column(Time, nullable=False)
    round_name: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="due", nullable=False)
    administered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dose_given: Mapped[str | None] = mapped_column(String(100), nullable=True)
    route_given: Mapped[str | None] = mapped_column(String(50), nullable=True)
    refusal_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    omission_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    witness_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_controlled_drug: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    second_checker_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    temperature_celsius: Mapped[float | None] = mapped_column(String(10), nullable=True)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_offline_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    offline_job_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="mar_records")
    medication: Mapped["Medication"] = relationship("Medication", back_populates="mar_records")
    administered_by: Mapped["User"] = relationship(
        "User", foreign_keys="MARRecord.administered_by_id"
    )
