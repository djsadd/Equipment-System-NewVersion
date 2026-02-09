from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db, security
from app.schemas import InventoryItemCreate, InventoryItemPublic, InventoryItemUpdate
from app.services import inventory_service

router = APIRouter(prefix="/items", tags=["inventory"])


@router.get("", response_model=list[InventoryItemPublic])
def list_items(db: Session = Depends(get_db)) -> list[InventoryItemPublic]:
    return inventory_service.list_items(db)


@router.get("/my", response_model=list[InventoryItemPublic])
def list_my_items(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InventoryItemPublic]:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return inventory_service.list_items_for_user(user_id, db)


@router.get("/room/{room_id}", response_model=list[InventoryItemPublic])
async def list_items_by_room(
    room_id: int,
    _current_user: dict[str, Any] = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> list[InventoryItemPublic]:
    token = credentials.credentials
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.location_service_url}/rooms/my/{room_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="room_forbidden")
    return inventory_service.list_items_for_location(room_id, db)


@router.get("/{item_id}", response_model=InventoryItemPublic)
def get_item(item_id: int, db: Session = Depends(get_db)) -> InventoryItemPublic:
    return inventory_service.get_item(item_id, db)


@router.post("", response_model=InventoryItemPublic, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: InventoryItemCreate, db: Session = Depends(get_db)
) -> InventoryItemPublic:
    return inventory_service.create_item(payload, db)


@router.put("/{item_id}", response_model=InventoryItemPublic)
def update_item(
    item_id: int,
    payload: InventoryItemUpdate,
    db: Session = Depends(get_db),
) -> InventoryItemPublic:
    return inventory_service.update_item(item_id, payload, db)


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)) -> dict:
    return inventory_service.delete_item(item_id, db)
