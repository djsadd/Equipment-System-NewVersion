from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy import DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db import Base
from app.models.enums import AuditActionStatus, AuditActionType


class AuditAction(Base):
    __tablename__ = "audit_actions"
    __table_args__ = (UniqueConstraint("idempotency_key", name="uq_action_idempotency_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    action_type: Mapped[AuditActionType] = mapped_column(
        sa.Enum(AuditActionType, name="audit_action_type"), nullable=False, index=True
    )
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict
    )
    status: Mapped[AuditActionStatus] = mapped_column(
        sa.Enum(AuditActionStatus, name="audit_action_status"),
        nullable=False,
        default=AuditActionStatus.pending,
        index=True,
    )

    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)

    last_error: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

