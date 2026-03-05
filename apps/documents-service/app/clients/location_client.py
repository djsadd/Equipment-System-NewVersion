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


def get_room(*, token: str, location_service_url: str, room_id: int) -> dict:
    urls = [f"{location_service_url}/rooms/my/{room_id}", f"{location_service_url}/rooms/{room_id}"]
    last_response = None
    try:
        with httpx.Client(timeout=5) as client:
            for url in urls:
                last_response = client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                )
                if last_response.status_code == status.HTTP_200_OK:
                    data = last_response.json()
                    return data if isinstance(data, dict) else {}
                if last_response.status_code == status.HTTP_404_NOT_FOUND:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND, detail="room_not_found"
                    )
                # for 403 on /rooms/my, try /rooms/{id} if token has admin rights
                if last_response.status_code == status.HTTP_403_FORBIDDEN:
                    continue
                # other codes -> stop
                break
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="location_service_unavailable",
        )

    code = last_response.status_code if last_response is not None else 502
    if code == status.HTTP_403_FORBIDDEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="room_forbidden")
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="location_service_error")
