from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InventoryItemBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    image: str | None = Field(default=None, max_length=1024)
    barcode_id: int | None = None
    location_id: int | None = None
    responsible_id: int | None = None
    status: str | None = Field(default=None, max_length=50)
    category: str | None = Field(default=None, max_length=100)
    last_inventory_at: datetime | None = None
    last_audit_at: datetime | None = None
    inventory_type_id: int | None = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    image: str | None = Field(default=None, max_length=1024)
    barcode_id: int | None = None
    location_id: int | None = None
    responsible_id: int | None = None
    status: str | None = Field(default=None, max_length=50)
    category: str | None = Field(default=None, max_length=100)
    last_inventory_at: datetime | None = None
    last_audit_at: datetime | None = None
    inventory_type_id: int | None = None


class InventoryItemPublic(BaseModel):
    id: int
    title: str
    description: str | None = None
    image: str | None = None
    barcode_id: int | None = None
    location_id: int | None = None
    responsible_id: int | None = None
    status: str | None = None
    category: str | None = None
    last_inventory_at: datetime | None = None
    last_audit_at: datetime | None = None
    inventory_type_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
