from __future__ import annotations

from app.schemas.barcode import BarcodeCreate, BarcodePublic
from app.schemas.inventory_audit import InventoryAuditCreate, InventoryAuditPublic
from app.schemas.inventory_bulk_move import InventoryBulkMoveRequest, InventoryBulkMoveResult
from app.schemas.inventory_item import (
    InventoryItemAddBarcodeRequest,
    InventoryItemCreate,
    InventoryItemPublic,
    InventoryItemScanRequest,
    InventoryItemUpdate,
)
from app.schemas.inventory_type import (
    InventoryTypeCreate,
    InventoryTypePublic,
    InventoryTypeUpdate,
)

__all__ = [
    "BarcodeCreate",
    "BarcodePublic",
    "InventoryAuditCreate",
    "InventoryAuditPublic",
    "InventoryBulkMoveRequest",
    "InventoryBulkMoveResult",
    "InventoryItemAddBarcodeRequest",
    "InventoryItemCreate",
    "InventoryItemPublic",
    "InventoryItemScanRequest",
    "InventoryItemUpdate",
    "InventoryTypeCreate",
    "InventoryTypePublic",
    "InventoryTypeUpdate",
]
