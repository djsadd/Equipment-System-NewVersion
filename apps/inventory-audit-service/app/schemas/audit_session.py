from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AuditSessionStatus


class AuditSessionCreate(BaseModel):
    plan_id: int | None = None
    location_id: int


class AuditSessionPublic(BaseModel):
    id: int
    plan_id: int | None = None
    location_id: int
    status: AuditSessionStatus
    started_by: int | None = None
    started_at: datetime | None = None
    closed_by: int | None = None
    closed_at: datetime | None = None
    approved_by: int | None = None
    approved_at: datetime | None = None
    applied_at: datetime | None = None
    expected_snapshot_version: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

