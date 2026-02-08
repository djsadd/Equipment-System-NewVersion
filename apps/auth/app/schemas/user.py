from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    department_id: int | None = None
    role: str | None = Field(default=None, max_length=100)


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    department_id: int | None = None
    role: str | None = Field(default=None, max_length=100)
    role_ids: list[int] = Field(default_factory=list)
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=72)
    full_name: str | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    department_id: int | None = None
    role: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None
    role_ids: list[int] | None = None


class UserPublic(BaseModel):
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


class UserRolesUpdate(BaseModel):
    role_ids: list[int] = Field(default_factory=list)
