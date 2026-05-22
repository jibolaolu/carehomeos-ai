from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Invoice(Base):
    __tablename__ = "invoices"

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
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    resident_id: Mapped[str | None] = mapped_column(
        ForeignKey("residents.id", ondelete="SET NULL"),
        nullable=True,
    )
    payer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    payer_type: Mapped[str] = mapped_column(String(50), nullable=False)
    la_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    chc_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    weekly_rate: Mapped[float] = mapped_column(String(15), nullable=False)
    number_of_weeks: Mapped[float] = mapped_column(String(10), nullable=False)
    subtotal: Mapped[float] = mapped_column(String(15), nullable=False)
    extras_total: Mapped[float] = mapped_column(String(15), default="0.00", nullable=False)
    vat_amount: Mapped[float] = mapped_column(String(15), default="0.00", nullable=False)
    total_amount: Mapped[float] = mapped_column(String(15), nullable=False)
    amount_paid: Mapped[float] = mapped_column(String(15), default="0.00", nullable=False)
    balance_due: Mapped[float] = mapped_column(String(15), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sent_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_la_billing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_chc_billing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_self_funded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="invoices")
