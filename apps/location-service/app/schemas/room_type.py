from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RoomTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    status: str | None = Field(default=None, max_length=50)


class RoomTypeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    status: str | None = Field(default=None, max_length=50)


class RoomTypePublic(BaseModel):
    id: int
    name: str
    status: str | None = None
    count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
