from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field


class InventoryBulkMoveRequest(BaseModel):
    item_ids: Annotated[list[int], Field(min_length=1, max_length=500)]
    location_id: int = Field(ge=1)
    responsible_id: int | None = Field(default=None, ge=1)
    generate_document: bool = False


class InventoryBulkMoveResult(BaseModel):
    moved_count: int
    moved_item_ids: list[int]
    not_found_item_ids: list[int] = Field(default_factory=list)
    generated_document_id: int | None = None
    generated_document_number: str | None = None
