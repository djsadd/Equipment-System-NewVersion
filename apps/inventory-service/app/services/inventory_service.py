from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Barcode, InventoryItem, InventoryType
from app.schemas import InventoryItemCreate, InventoryItemUpdate


def list_items(db: Session) -> list[InventoryItem]:
    return db.execute(select(InventoryItem).order_by(InventoryItem.id)).scalars().all()


def get_item(item_id: int, db: Session) -> InventoryItem:
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item_not_found")
    return item


def create_item(payload: InventoryItemCreate, db: Session) -> InventoryItem:
    if payload.barcode_id is not None:
        barcode = db.get(Barcode, payload.barcode_id)
        if not barcode:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="barcode_not_found"
            )
    if payload.inventory_type_id is not None:
        inventory_type = db.get(InventoryType, payload.inventory_type_id)
        if not inventory_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="inventory_type_not_found"
            )

    item = InventoryItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(item_id: int, payload: InventoryItemUpdate, db: Session) -> InventoryItem:
    item = get_item(item_id, db)
    data = payload.model_dump(exclude_unset=True)

    if "barcode_id" in data and data["barcode_id"] is not None:
        barcode = db.get(Barcode, data["barcode_id"])
        if not barcode:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="barcode_not_found"
            )

    if "inventory_type_id" in data and data["inventory_type_id"] is not None:
        inventory_type = db.get(InventoryType, data["inventory_type_id"])
        if not inventory_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="inventory_type_not_found"
            )

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


def delete_item(item_id: int, db: Session) -> dict:
    item = get_item(item_id, db)
    db.delete(item)
    db.commit()
    return {"status": "ok"}
