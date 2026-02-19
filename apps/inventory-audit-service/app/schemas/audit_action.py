from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import AuditActionStatus, AuditActionType


class AuditActionPublic(BaseModel):
    id: int
    session_id: int
    action_type: AuditActionType
    payload: dict[str, Any]
    status: AuditActionStatus
    idempotency_key: str
    last_error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

