from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas import InventoryItemCreate, InventoryItemPublic, InventoryItemUpdate
from app.services import inventory_service

router = APIRouter(prefix="/items", tags=["inventory"])


@router.get("", response_model=list[InventoryItemPublic])
def list_items(db: Session = Depends(get_db)) -> list[InventoryItemPublic]:
    return inventory_service.list_items(db)


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
