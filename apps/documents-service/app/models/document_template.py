from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import DocumentTemplateStatus


class DocumentTemplate(Base):
    __tablename__ = "docgen_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type_code: Mapped[str] = mapped_column(String(64), index=True)
    version: Mapped[str] = mapped_column(String(64))
    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), index=True, default=DocumentTemplateStatus.ACTIVE.value
    )
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    docx_blob: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
