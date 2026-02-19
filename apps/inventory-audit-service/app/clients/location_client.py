from __future__ import annotations

import httpx
from fastapi import HTTPException, status


def assert_room_access(*, token: str, location_service_url: str, room_id: int) -> None:
    try:
        with httpx.Client(timeout=5) as client:
            response = client.get(
                f"{location_service_url}/rooms/my/{room_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="location_service_unavailable",
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="room_forbidden")

