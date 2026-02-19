from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import AuditSessionStatus


class AuditSession(Base):
    __tablename__ = "audit_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    location_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    status: Mapped[AuditSessionStatus] = mapped_column(
        sa.Enum(AuditSessionStatus, name="audit_session_status"),
        nullable=False,
        default=AuditSessionStatus.draft,
        index=True,
    )

    started_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    approved_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    expected_snapshot_version: Mapped[str | None] = mapped_column(sa.String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )

