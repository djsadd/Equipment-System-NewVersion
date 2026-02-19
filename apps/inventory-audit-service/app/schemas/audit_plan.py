from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AuditPlanStatus, AuditScopeType


class AuditPlanCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    scope_type: AuditScopeType
    scope_payload: dict[str, Any] = Field(default_factory=dict)
    start_date: date | None = None
    end_date: date | None = None


class AuditPlanUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    scope_type: AuditScopeType | None = None
    scope_payload: dict[str, Any] | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: AuditPlanStatus | None = None


class AuditPlanPublic(BaseModel):
    id: int
    title: str
    scope_type: AuditScopeType
    scope_payload: dict[str, Any]
    start_date: date | None = None
    end_date: date | None = None
    status: AuditPlanStatus
    created_by: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

