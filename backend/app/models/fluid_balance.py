from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class FluidBalance(Base):
    __tablename__ = "fluid_balances"

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
    balance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    entry_type: Mapped[str] = mapped_column(String(50), nullable=False)
    fluid_type: Mapped[str] = mapped_column(String(100), nullable=False)
    route: Mapped[str] = mapped_column(String(50), nullable=False)
    volume_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    is_intake: Mapped[bool] = mapped_column(Boolean, nullable=False)
    cumulative_intake_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cumulative_output_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cumulative_balance_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_intake_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deviation_from_target_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deviation_alert_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_offline_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="fluid_balances")
