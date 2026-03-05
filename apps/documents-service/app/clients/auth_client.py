from __future__ import annotations

from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status


def lookup_users(*, token: str, auth_service_url: str, ids: list[int]) -> list[dict]:
    unique_ids = []
    seen: set[int] = set()
    for user_id in ids:
        if not isinstance(user_id, int) or user_id <= 0:
            continue
        if user_id in seen:
            continue
        seen.add(user_id)
        unique_ids.append(user_id)

    if not unique_ids:
        return []

    # FastAPI expects repeated query params: ?ids=1&ids=2
    qs = urlencode([("ids", str(i)) for i in unique_ids])
    url = f"{auth_service_url}/auth/users/lookup?{qs}"
    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url, headers={"Authorization": f"Bearer {token}"})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="auth_service_unavailable",
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="auth_service_error"
        )
    data = response.json()
    return data if isinstance(data, list) else []

