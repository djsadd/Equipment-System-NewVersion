from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    room_type: str = Field(min_length=1, max_length=100)
    responsible_id: int | None = None
    status: str | None = Field(default=None, max_length=50)


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    room_type: str | None = Field(default=None, max_length=100)
    responsible_id: int | None = None
    status: str | None = Field(default=None, max_length=50)


class RoomPublic(BaseModel):
    id: int
    name: str
    room_type: str
    responsible_id: int | None = None
    status: str | None = None
    last_inventory_at: datetime | None = None
    last_audit_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
