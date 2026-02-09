from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    location_id: int | None = None
    status: str | None = Field(default=None, max_length=50)


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    location_id: int | None = None
    status: str | None = Field(default=None, max_length=50)


class DepartmentPublic(BaseModel):
    id: int
    name: str
    location_id: int | None = None
    status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentUserPublic(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    department_id: int | None = None
    role: str | None = None
    is_active: bool
    created_at: datetime | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
