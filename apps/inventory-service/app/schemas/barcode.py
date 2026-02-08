from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BarcodeCreate(BaseModel):
    value: str = Field(min_length=1, max_length=128)


class BarcodePublic(BaseModel):
    id: int
    value: str
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
