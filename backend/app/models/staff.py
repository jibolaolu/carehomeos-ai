from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Staff(Base):
    __tablename__ = "staff"

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
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    employee_number: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    job_title: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(50), default="full_time", nullable=False)
    contracted_hours: Mapped[float] = mapped_column(String(10), default="37.5", nullable=False)
    hourly_rate: Mapped[float | None] = mapped_column(String(10), nullable=True)
    annual_salary: Mapped[float | None] = mapped_column(String(15), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    dbs_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dbs_issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    dbs_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    right_to_work_checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    right_to_work_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    nvq_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nurse_pin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nurse_pin_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    training_expiry_dates: Mapped[str | None] = mapped_column(Text, nullable=True)
    mandatory_training_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    supervisions_due: Mapped[date | None] = mapped_column(Date, nullable=True)
    appraisal_due: Mapped[date | None] = mapped_column(Date, nullable=True)
    sickness_absences_ytd: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    agency_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_agency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="staff")
    shifts: Mapped[list["Shift"]] = relationship("Shift", back_populates="staff_member")
