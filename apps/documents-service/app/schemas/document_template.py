from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentTemplatePublic(BaseModel):
    id: int
    type_code: str
    version: str
    effective_from: date | None = None
    status: str
    original_filename: str | None = None
    created_at: datetime | None = None
    archived_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class DocumentTemplateCreate(BaseModel):
    type_code: str = Field(min_length=1, max_length=64)
    version: str = Field(min_length=1, max_length=64)
    effective_from: date | None = None

