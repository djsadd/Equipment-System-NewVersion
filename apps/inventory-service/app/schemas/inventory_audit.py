from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InventoryAuditCreate(BaseModel):
    inventory_item_id: int
    audited_at: datetime | None = None
    auditor_id: int | None = None
    status: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=5000)


class InventoryAuditPublic(BaseModel):
    id: int
    inventory_item_id: int
    audited_at: datetime | None = None
    auditor_id: int | None = None
    status: str | None = None
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)
