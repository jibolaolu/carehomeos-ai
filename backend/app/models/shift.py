from __future__ import annotations

import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Shift(Base):
    __tablename__ = "shifts"

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
    staff_id: Mapped[str] = mapped_column(
        ForeignKey("staff.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shift_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    shift_type: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)
    role_assigned: Mapped[str] = mapped_column(String(50), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    residents_assigned: Mapped[str | None] = mapped_column(Text, nullable=True)
    handover_notes_in: Mapped[str | None] = mapped_column(Text, nullable=True)
    handover_notes_out: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_handover_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_handover_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    clock_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    clock_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    clock_in_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    clock_out_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    overtime_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_banked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_agency_cover: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    agency_brief_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    agency_brief_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    wtd_compliant: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    wtd_hours_week: Mapped[float | None] = mapped_column(String(10), nullable=True)
    created_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="shifts")
    staff_member: Mapped["Staff"] = relationship("Staff", back_populates="shifts")
