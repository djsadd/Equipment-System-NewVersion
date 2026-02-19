from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class InventoryEventCreate(BaseModel):
    item_id: int
    event_type: str = Field(min_length=1, max_length=50)
    from_location_id: int | None = None
    to_location_id: int | None = None
    from_responsible_id: int | None = None
    to_responsible_id: int | None = None
    metadata: dict[str, Any] | None = None


class InventoryEventPublic(BaseModel):
    id: int
    item_id: int
    event_type: str
    actor_user_id: int | None = None
    from_location_id: int | None = None
    to_location_id: int | None = None
    from_responsible_id: int | None = None
    to_responsible_id: int | None = None
    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_",
        serialization_alias="metadata",
    )
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
