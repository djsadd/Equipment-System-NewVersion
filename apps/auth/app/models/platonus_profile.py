from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class PlatonusProfile(Base):
    __tablename__ = "platonus_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_platonus_profiles_user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    username: Mapped[str] = mapped_column(String(100), index=True)
    person_id: Mapped[str] = mapped_column(String(50), index=True)
    primary_role: Mapped[str] = mapped_column(String(50))
    roles: Mapped[list[str]] = mapped_column(JSONB, default=list)
    info: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="platonus_profile")

