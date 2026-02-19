from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AuditScanCreate(BaseModel):
    barcode_value: str | None = Field(default=None, min_length=1, max_length=128)
    item_id: int | None = None
    found_location_id: int
    notes: str | None = Field(default=None, max_length=5000)
    photo_url: str | None = Field(default=None, max_length=2048)
    client_scan_id: str = Field(min_length=1, max_length=64)
    extra: dict | None = None

    @field_validator("barcode_value")
    @classmethod
    def _normalize_barcode_value(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().replace(" ", "")
        if len(normalized) == 13 and normalized.isdigit():
            return normalized[:12]
        return normalized


class AuditScanPublic(BaseModel):
    id: int
    session_id: int
    scanner_user_id: int
    scan_time: datetime | None = None
    barcode_value: str | None = None
    item_id: int | None = None
    found_location_id: int
    notes: str | None = None
    photo_url: str | None = None
    client_scan_id: str
    extra: dict | None = None

    model_config = ConfigDict(from_attributes=True)
