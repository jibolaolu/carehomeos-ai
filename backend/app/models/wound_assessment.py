from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class WoundAssessment(Base):
    __tablename__ = "wound_assessments"

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
    assessed_by_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False)
    wound_location: Mapped[str] = mapped_column(String(200), nullable=False)
    body_map_x: Mapped[float | None] = mapped_column(String(10), nullable=True)
    body_map_y: Mapped[float | None] = mapped_column(String(10), nullable=True)
    wound_type: Mapped[str] = mapped_column(String(100), nullable=False)
    wound_cause: Mapped[str | None] = mapped_column(String(200), nullable=True)
    length_cm: Mapped[float | None] = mapped_column(String(10), nullable=True)
    width_cm: Mapped[float | None] = mapped_column(String(10), nullable=True)
    depth_cm: Mapped[float | None] = mapped_column(String(10), nullable=True)
    tissue_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tissue_percentage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    exudate_amount: Mapped[str | None] = mapped_column(String(50), nullable=True)
    exudate_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    odour: Mapped[str | None] = mapped_column(String(50), nullable=True)
    wound_edge: Mapped[str | None] = mapped_column(String(100), nullable=True)
    periwound_skin: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pain_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    infection_signs: Mapped[str | None] = mapped_column(Text, nullable=True)
    healing_status: Mapped[str] = mapped_column(String(50), default="assessing", nullable=False)
    healing_trajectory: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dressing_type: Mapped[str | None] = mapped_column(String(200), nullable=True)
    dressing_change_frequency: Mapped[str | None] = mapped_column(String(50), nullable=True)
    next_dressing_change: Mapped[date | None] = mapped_column(Date, nullable=True)
    photo_urls: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    referral_made: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    referral_to: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="wound_assessments")
