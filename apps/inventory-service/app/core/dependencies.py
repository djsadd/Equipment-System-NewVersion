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
