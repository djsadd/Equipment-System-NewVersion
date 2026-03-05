from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.inventory_status import InventoryStatus
from app.schemas.inventory_item import _coerce_inventory_status


class InventoryImportItemData(BaseModel):
    id: int | None = None
    title: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    category: str | None = Field(default=None, max_length=100)

    location: str | None = Field(default=None, max_length=255)
    location_id: int | None = None

    responsible_username: str | None = Field(default=None, max_length=255)
    responsible_first_name: str | None = Field(default=None, max_length=100)
    responsible_last_name: str | None = Field(default=None, max_length=100)
    responsible_id: int | None = None

    status: InventoryStatus | None = None

    barcode_id: int | None = None
    barcode_data_12: str | None = Field(default=None, max_length=128)

    @field_validator("status", mode="before")
    @classmethod
    def _validate_status(cls, value: object) -> object:
        return _coerce_inventory_status(value)


class InventoryImportPreviewRow(BaseModel):
    row_number: int = Field(ge=1)
    action: Literal["create", "skip_existing", "error"]
    data: InventoryImportItemData
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class InventoryImportPreviewResponse(BaseModel):
    total_rows: int
    to_create_count: int
    skip_count: int
    error_count: int
    rows: list[InventoryImportPreviewRow]


class InventoryImportConfirmResponse(BaseModel):
    created_count: int
    skipped_count: int
    error_count: int
    created_item_ids: list[int] = Field(default_factory=list)
    errors: list[dict] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")

