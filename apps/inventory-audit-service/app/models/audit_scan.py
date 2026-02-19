from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db import Base


class AuditScan(Base):
    __tablename__ = "audit_scans"
    __table_args__ = (
        UniqueConstraint("session_id", "client_scan_id", name="uq_scan_session_client_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    scanner_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    scan_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    barcode_value: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    item_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    found_location_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    notes: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    client_scan_id: Mapped[str] = mapped_column(String(64), nullable=False)

    extra: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )

