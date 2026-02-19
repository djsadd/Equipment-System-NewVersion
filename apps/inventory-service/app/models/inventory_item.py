from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.inventory_status import InventoryStatus

if TYPE_CHECKING:
    from app.models.barcode import Barcode
    from app.models.inventory_audit import InventoryAudit
    from app.models.inventory_type import InventoryType


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image: Mapped[str | None] = mapped_column(Text, nullable=True)
    barcode_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("barcodes.id"), unique=True, nullable=True
    )
    location_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    responsible_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    status: Mapped[InventoryStatus | None] = mapped_column(
        Enum(
            InventoryStatus,
            name="inventory_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        index=True,
        nullable=True,
    )
    category: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    last_inventory_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_audit_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    inventory_type_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("inventory_types.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    barcode: Mapped[Barcode | None] = relationship(back_populates="inventory_item")
    barcodes: Mapped[list[Barcode]] = relationship(
        secondary="inventory_item_barcodes", back_populates="inventory_items"
    )
    inventory_type: Mapped[InventoryType | None] = relationship(back_populates="items")
    audits: Mapped[list[InventoryAudit]] = relationship(
        back_populates="inventory_item", cascade="all, delete-orphan"
    )
