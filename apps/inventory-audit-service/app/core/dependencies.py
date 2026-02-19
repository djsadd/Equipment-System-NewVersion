from __future__ import annotations

from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import SessionLocal

security = HTTPBearer()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    token = credentials.credentials
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.auth_service_url}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    data = response.json()
    if not isinstance(data, dict):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    return data


def _has_role(current_user: dict[str, Any], role: str) -> bool:
    roles = current_user.get("roles") if isinstance(current_user, dict) else None
    return isinstance(roles, list) and role in roles


def require_system_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not _has_role(current_user, settings.system_admin_role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_required")
    return current_user


def require_audit_auditor(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if _has_role(current_user, settings.system_admin_role):
        return current_user
    if not _has_role(current_user, settings.audit_auditor_role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="auditor_required")
    return current_user


def require_audit_supervisor(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if _has_role(current_user, settings.system_admin_role):
        return current_user
    if not _has_role(current_user, settings.audit_supervisor_role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="supervisor_required")
    return current_user

