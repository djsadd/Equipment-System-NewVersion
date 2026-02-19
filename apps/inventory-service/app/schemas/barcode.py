from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BarcodeCreate(BaseModel):
    value: str | None = Field(default=None, min_length=1, max_length=128)
    title: str | None = Field(default=None, max_length=255)


class BarcodePublic(BaseModel):
    id: int
    value: str | None = None
    title: str | None = None
    image_filename: str | None = None
    zpl_barcode: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
