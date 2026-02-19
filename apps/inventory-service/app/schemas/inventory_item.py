from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.inventory_status import InventoryStatus
from app.schemas.barcode import BarcodePublic


def _coerce_inventory_status(value: object) -> object:
    if value is None or isinstance(value, InventoryStatus):
        return value

    if isinstance(value, str):
        if value in InventoryStatus.__members__:
            return InventoryStatus[value]

        allowed_values = {item.value for item in InventoryStatus}
        if value in allowed_values:
            return value

        candidate = value
        for _ in range(2):
            try:
                candidate = candidate.encode("cp1251").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
            if candidate in allowed_values:
                return candidate

    return value


class InventoryItemBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    image: str | None = None
    barcode_id: int | None = None
    location_id: int | None = None
    responsible_id: int | None = None
    status: InventoryStatus | None = None
    category: str | None = Field(default=None, max_length=100)
    last_inventory_at: datetime | None = None
    last_audit_at: datetime | None = None
    inventory_type_id: int | None = None

    @field_validator("status", mode="before")
    @classmethod
    def _validate_status(cls, value: object) -> object:
        return _coerce_inventory_status(value)


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    image: str | None = None
    barcode_id: int | None = None
    location_id: int | None = None
    responsible_id: int | None = None
    status: InventoryStatus | None = None
    category: str | None = Field(default=None, max_length=100)
    last_inventory_at: datetime | None = None
    last_audit_at: datetime | None = None
    inventory_type_id: int | None = None

    @field_validator("status", mode="before")
    @classmethod
    def _validate_status(cls, value: object) -> object:
        return _coerce_inventory_status(value)


class InventoryItemAddBarcodeRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)


class InventoryItemScanRequest(BaseModel):
    barcode_value: str = Field(min_length=1, max_length=128)


class InventoryItemPublic(BaseModel):
    id: int
    title: str
    description: str | None = None
    image: str | None = None
    barcode_id: int | None = None
    barcodes: list[BarcodePublic] = Field(default_factory=list)
    location_id: int | None = None
    responsible_id: int | None = None
    status: InventoryStatus | None = None
    category: str | None = None
    last_inventory_at: datetime | None = None
    last_audit_at: datetime | None = None
    inventory_type_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
