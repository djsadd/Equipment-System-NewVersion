from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

NotificationType = Literal["system", "alert", "info", "task"]


class NotificationPublic(BaseModel):
    id: int
    user_id: int
    type: NotificationType
    title: str
    message: str
    payload: dict[str, Any] | None = None
    source_service: str | None = None
    source_event: str | None = None
    created_at: datetime | None = None
    read_at: datetime | None = None
    archived_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListItem(NotificationPublic):
    pass


class InternalNotificationCreate(BaseModel):
    user_ids: list[int] = Field(min_length=1)
    type: NotificationType
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)
    payload: dict[str, Any] | None = None
    source_service: str | None = Field(default=None, max_length=50)
    source_event: str | None = Field(default=None, max_length=100)
    idempotency_key: str | None = Field(default=None, max_length=200)


class NotificationMarkRead(BaseModel):
    ids: list[int] = Field(min_length=1)


class PreferencesPublic(BaseModel):
    user_id: int
    channels: dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class PreferencesUpdate(BaseModel):
    channels: dict[str, Any] | None = None
