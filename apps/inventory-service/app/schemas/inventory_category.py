from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InventoryCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class InventoryCategoryPublic(BaseModel):
    id: int
    name: str
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

