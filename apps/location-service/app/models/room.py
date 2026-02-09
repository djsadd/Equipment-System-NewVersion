from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    room_type: Mapped[str] = mapped_column(String(100), index=True)
    responsible_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), server_default=text("'Активен'"), nullable=False
    )
    last_inventory_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_audit_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
