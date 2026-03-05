from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GeneratedDocumentPublic(BaseModel):
    id: int
    doc_number: str
    type_code: str
    template_id: int
    template_version: str
    generated_at: datetime
    generated_by_user_id: int
    status: str
    target_type: str
    target_id: int
    notes: str | None = None

    room_id: int | None = None
    room_name: str | None = None
    responsible_user_id: int | None = None
    responsible_user_name: str | None = None
    to_room_id: int | None = None
    to_room_name: str | None = None
    to_responsible_user_id: int | None = None
    to_responsible_user_name: str | None = None
    equipment_name: str | None = None
    inventory_number: str | None = None
    equipment_count: int | None = None
    equipment_ids: list[int] | None = None
    equipment_list_text: str | None = None
    created_at: datetime | None = None
    archived_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class GeneratedDocumentPagePublic(BaseModel):
    items: list[GeneratedDocumentPublic]
    total: int
    limit: int
    offset: int


class DocumentGenerateRequest(BaseModel):
    type_code: str = Field(min_length=1, max_length=64)
    target_type: str = Field(min_length=1, max_length=32)
    target_id: int
    to_room_id: int | None = Field(default=None, ge=1)
    to_responsible_id: int | None = Field(default=None, ge=1)
    notes: str | None = Field(default=None, max_length=5000)
    include_pdf: bool = True


class DocumentGenerateBatchRequest(BaseModel):
    type_code: str = Field(min_length=1, max_length=64)
    target_type: str = Field(min_length=1, max_length=32)
    target_ids: list[int] = Field(min_length=1)
    to_room_id: int | None = Field(default=None, ge=1)
    to_responsible_id: int | None = Field(default=None, ge=1)
    notes: str | None = Field(default=None, max_length=5000)
    include_pdf: bool = True
