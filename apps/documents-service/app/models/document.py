from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class GeneratedDocument(Base):
    __tablename__ = "docgen_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doc_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    type_code: Mapped[str] = mapped_column(String(64), index=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("docgen_templates.id"))
    template_version: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    generated_by_user_id: Mapped[int] = mapped_column(Integer, index=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    target_type: Mapped[str] = mapped_column(String(32), index=True)
    target_id: Mapped[int] = mapped_column(Integer, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    room_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    room_name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    responsible_user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    responsible_user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    to_room_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    to_room_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    to_responsible_user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    to_responsible_user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    equipment_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    inventory_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    equipment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    equipment_ids: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    equipment_list_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    docx_blob: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    pdf_blob: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    template = relationship("DocumentTemplate")
