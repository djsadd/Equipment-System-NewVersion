from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class InventoryItemBarcode(Base):
    __tablename__ = "inventory_item_barcodes"
    __table_args__ = (
        UniqueConstraint("inventory_item_id", "barcode_id", name="uq_item_barcode_pair"),
        UniqueConstraint("barcode_id", name="uq_item_barcode_barcode_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inventory_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("inventory_items.id", ondelete="CASCADE"), index=True
    )
    barcode_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("barcodes.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

