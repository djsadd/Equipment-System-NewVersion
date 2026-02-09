from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.department import DepartmentUserPublic


async def list_users_for_department(
    department_id: int, token: str
) -> list[DepartmentUserPublic]:
    users = await _fetch_users(token)
    return [
        DepartmentUserPublic.model_validate(user)
        for user in users
        if isinstance(user, dict) and user.get("department_id") == department_id
    ]


async def assign_user_to_department(
    department_id: int, user_id: int, token: str
) -> DepartmentUserPublic:
    payload = {"department_id": department_id}
    data = await _update_user(user_id, payload, token)
    return DepartmentUserPublic.model_validate(data)


async def unassign_user_from_department(
    user_id: int, token: str
) -> DepartmentUserPublic:
    payload = {"department_id": None}
    data = await _update_user(user_id, payload, token)
    return DepartmentUserPublic.model_validate(data)


async def _fetch_users(token: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.auth_service_url}/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=response.status_code, detail="auth_service_error"
        )
    data = response.json()
    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="auth_invalid_response"
        )
    return data


async def _update_user(
    user_id: int, payload: dict[str, Any], token: str
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.put(
            f"{settings.auth_service_url}/admin/users/{user_id}",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=response.status_code, detail="auth_service_error"
        )
    data = response.json()
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="auth_invalid_response"
        )
    return data
