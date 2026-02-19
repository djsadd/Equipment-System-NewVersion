from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import AuditItemResultStatus


class AuditItemResult(Base):
    __tablename__ = "audit_item_results"
    __table_args__ = (UniqueConstraint("session_id", "item_id", name="uq_result_session_item"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    status: Mapped[AuditItemResultStatus] = mapped_column(
        sa.Enum(AuditItemResultStatus, name="audit_item_result_status"),
        nullable=False,
        default=AuditItemResultStatus.missing,
        index=True,
    )

    expected_location_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    found_location_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    first_found_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_scan_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )

