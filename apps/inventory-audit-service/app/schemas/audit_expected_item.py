from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditExpectedItemPublic(BaseModel):
    id: int
    session_id: int
    item_id: int
    expected_location_id: int | None = None
    expected_responsible_id: int | None = None
    barcode_id: int | None = None
    captured_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

