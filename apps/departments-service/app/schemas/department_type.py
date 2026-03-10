from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DepartmentTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    status: str | None = Field(default=None, max_length=50)


class DepartmentTypeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    status: str | None = Field(default=None, max_length=50)


class DepartmentTypePublic(BaseModel):
    id: int
    name: str
    status: str | None = None
    count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

