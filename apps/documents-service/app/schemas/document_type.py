from __future__ import annotations

from pydantic import BaseModel, Field


class DocumentTypePublic(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)

