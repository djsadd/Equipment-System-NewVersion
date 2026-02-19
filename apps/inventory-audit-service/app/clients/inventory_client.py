from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException, status


def resolve_item_by_barcode(
    *, token: str, inventory_service_url: str, barcode_value: str
) -> dict[str, Any] | None:
    try:
        with httpx.Client(timeout=10) as client:
            response = client.post(
                f"{inventory_service_url}/items/resolve",
                headers={"Authorization": f"Bearer {token}"},
                json={"barcode_value": barcode_value},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="inventory_service_unavailable",
        )

    if response.status_code == status.HTTP_403_FORBIDDEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="inventory_forbidden")
    if response.status_code == status.HTTP_404_NOT_FOUND:
        return None
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="inventory_service_error",
        )

    data = response.json()
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="inventory_service_invalid_response",
        )
    return data


def list_items_by_room(
    *, token: str, inventory_service_url: str, room_id: int
) -> list[dict[str, Any]]:
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

    if response.status_code == status.HTTP_403_FORBIDDEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="room_forbidden")
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="inventory_service_error",
        )

    data = response.json()
    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="inventory_service_invalid_response",
        )
    return data


def bulk_move_items(
    *,
    token: str,
    inventory_service_url: str,
    item_ids: list[int],
    location_id: int,
    responsible_id_is_set: bool,
    responsible_id: int | None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"item_ids": item_ids, "location_id": location_id}
    if responsible_id_is_set:
        body["responsible_id"] = responsible_id

    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(
                f"{inventory_service_url}/items/bulk-move",
                headers={"Authorization": f"Bearer {token}"},
                json=body,
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="inventory_service_unavailable",
        )

    if response.status_code == status.HTTP_403_FORBIDDEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="inventory_forbidden")
    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="location_not_found")
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="inventory_service_error",
        )

    data = response.json()
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="inventory_service_invalid_response",
        )
    return data
