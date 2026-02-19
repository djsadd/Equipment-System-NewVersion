from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.inventory_item import InventoryItem


class Barcode(Base):
    __tablename__ = "barcodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    value: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_png: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    zpl_barcode: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    inventory_item: Mapped[InventoryItem | None] = relationship(
        back_populates="barcode", uselist=False
    )

    inventory_items: Mapped[list[InventoryItem]] = relationship(
        secondary="inventory_item_barcodes", back_populates="barcodes"
    )
