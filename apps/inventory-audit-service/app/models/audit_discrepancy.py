from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db import Base
from app.models.enums import DiscrepancyType, ResolutionStatus


class AuditDiscrepancy(Base):
    __tablename__ = "audit_discrepancies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    type: Mapped[DiscrepancyType] = mapped_column(
        sa.Enum(DiscrepancyType, name="audit_discrepancy_type"),
        nullable=False,
        index=True,
    )

    item_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    barcode_value: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)

    expected_location_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    found_location_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    resolution_status: Mapped[ResolutionStatus] = mapped_column(
        sa.Enum(ResolutionStatus, name="audit_resolution_status"),
        nullable=False,
        default=ResolutionStatus.open,
        index=True,
    )
    resolution_payload: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )

