from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import DiscrepancyType, ResolutionStatus


class AuditDiscrepancyPublic(BaseModel):
    id: int
    session_id: int
    type: DiscrepancyType
    item_id: int | None = None
    barcode_value: str | None = None
    expected_location_id: int | None = None
    found_location_id: int | None = None
    resolution_status: ResolutionStatus
    resolution_payload: dict[str, Any] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AuditDiscrepancyResolve(BaseModel):
    resolution_status: ResolutionStatus
    resolution_payload: dict[str, Any] | None = None

