from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class CatheterStomaRecord(Base):
    __tablename__ = "catheter_stoma_records"

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
    record_type: Mapped[str] = mapped_column(String(50), nullable=False)
    insertion_date: Mapped[date] = mapped_column(Date, nullable=False)
    catheter_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    catheter_size: Mapped[str | None] = mapped_column(String(20), nullable=True)
    stoma_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stoma_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    change_frequency_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_change_due: Mapped[date | None] = mapped_column(Date, nullable=True)
    urine_colour: Mapped[str | None] = mapped_column(String(50), nullable=True)
    urine_clarity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    urine_odour: Mapped[str | None] = mapped_column(String(50), nullable=True)
    urine_amount_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stoma_output_consistency: Mapped[str | None] = mapped_column(String(50), nullable=True)
    stoma_output_amount: Mapped[str | None] = mapped_column(String(50), nullable=True)
    peristomal_skin_condition: Mapped[str | None] = mapped_column(String(100), nullable=True)
    complications: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    removed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    removed_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="catheter_stoma_records")
