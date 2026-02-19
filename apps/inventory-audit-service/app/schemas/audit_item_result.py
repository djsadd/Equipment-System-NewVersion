from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AuditItemResultStatus


class AuditItemResultPublic(BaseModel):
    id: int
    session_id: int
    item_id: int
    status: AuditItemResultStatus
    expected_location_id: int | None = None
    found_location_id: int | None = None
    first_found_at: datetime | None = None
    last_scan_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

