from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field


class InventoryBulkMoveRequest(BaseModel):
    item_ids: Annotated[list[int], Field(min_length=1, max_length=500)]
    location_id: int = Field(ge=1)
    responsible_id: int | None = Field(default=None, ge=1)


class InventoryBulkMoveResult(BaseModel):
    moved_count: int
    moved_item_ids: list[int]
    not_found_item_ids: list[int] = Field(default_factory=list)
