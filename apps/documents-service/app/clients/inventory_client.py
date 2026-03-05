from __future__ import annotations

import httpx
from fastapi import HTTPException, status


def get_inventory_item(*, inventory_service_url: str, item_id: int) -> dict:
    try:
        with httpx.Client(timeout=5) as client:
            response = client.get(f"{inventory_service_url}/items/{item_id}")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="inventory_service_unavailable",
        )

    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="equipment_not_found")
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="inventory_service_error"
        )
    data = response.json()
    return data if isinstance(data, dict) else {}


def list_items_by_room(*, token: str, inventory_service_url: str, room_id: int) -> list[dict]:
    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(
                f"{inventory_service_url}/items/room/{room_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="inventory_service_unavailable",
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="inventory_service_error"
        )

    data = response.json()
    return data if isinstance(data, list) else []

