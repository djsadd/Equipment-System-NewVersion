from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas import InventoryTypeCreate, InventoryTypePublic, InventoryTypeUpdate
from app.services import inventory_type_service

router = APIRouter(prefix="/types", tags=["inventory-types"])


@router.get("", response_model=list[InventoryTypePublic])
def list_inventory_types(db: Session = Depends(get_db)) -> list[InventoryTypePublic]:
    return inventory_type_service.list_inventory_types(db)


@router.get("/{type_id}", response_model=InventoryTypePublic)
def get_inventory_type(type_id: int, db: Session = Depends(get_db)) -> InventoryTypePublic:
    return inventory_type_service.get_inventory_type(type_id, db)


@router.post("", response_model=InventoryTypePublic, status_code=status.HTTP_201_CREATED)
def create_inventory_type(
    payload: InventoryTypeCreate, db: Session = Depends(get_db)
) -> InventoryTypePublic:
    return inventory_type_service.create_inventory_type(payload, db)


@router.put("/{type_id}", response_model=InventoryTypePublic)
def update_inventory_type(
    type_id: int,
    payload: InventoryTypeUpdate,
    db: Session = Depends(get_db),
) -> InventoryTypePublic:
    return inventory_type_service.update_inventory_type(type_id, payload, db)


@router.delete("/{type_id}")
def delete_inventory_type(type_id: int, db: Session = Depends(get_db)) -> dict:
    return inventory_type_service.delete_inventory_type(type_id, db)
