from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AuditExpectedItem(Base):
    __tablename__ = "audit_expected_items"
    __table_args__ = (UniqueConstraint("session_id", "item_id", name="uq_expected_session_item"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    expected_location_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    expected_responsible_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    barcode_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

