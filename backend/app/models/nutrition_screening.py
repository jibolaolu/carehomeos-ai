from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class NutritionScreening(Base):
    __tablename__ = "nutrition_screenings"

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
    bmi: Mapped[float | None] = mapped_column(String(10), nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(String(10), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(String(10), nullable=True)
    unplanned_weight_loss_kg: Mapped[float | None] = mapped_column(String(10), nullable=True)
    unplanned_weight_loss_percent: Mapped[float | None] = mapped_column(String(10), nullable=True)
    weight_loss_time_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    acute_disease_effect: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    must_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    must_risk_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    malnutrition_risk: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recommended_actions: Mapped[str | None] = mapped_column(Text, nullable=True)
    dietitian_referral_made: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dietitian_referral_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    supplement_prescribed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    supplement_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    food_first_approach: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    texture_modification: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fluid_target_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_review_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="nutrition_screenings")
