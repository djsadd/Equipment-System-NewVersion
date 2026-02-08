from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import InventoryType
from app.schemas import InventoryTypeCreate, InventoryTypeUpdate


def list_inventory_types(db: Session) -> list[InventoryType]:
    return db.execute(select(InventoryType).order_by(InventoryType.id)).scalars().all()


def get_inventory_type(type_id: int, db: Session) -> InventoryType:
    inventory_type = db.get(InventoryType, type_id)
    if not inventory_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="inventory_type_not_found"
        )
    return inventory_type


def create_inventory_type(payload: InventoryTypeCreate, db: Session) -> InventoryType:
    existing = db.execute(
        select(InventoryType).where(InventoryType.name == payload.name)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="inventory_type_already_exists"
        )
    inventory_type = InventoryType(name=payload.name, description=payload.description)
    db.add(inventory_type)
    db.commit()
    db.refresh(inventory_type)
    return inventory_type


def update_inventory_type(
    type_id: int, payload: InventoryTypeUpdate, db: Session
) -> InventoryType:
    inventory_type = get_inventory_type(type_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        existing = db.execute(
            select(InventoryType).where(
                InventoryType.name == data["name"], InventoryType.id != type_id
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="inventory_type_already_exists",
            )

    for key, value in data.items():
        setattr(inventory_type, key, value)
    db.commit()
    db.refresh(inventory_type)
    return inventory_type


def delete_inventory_type(type_id: int, db: Session) -> dict:
    inventory_type = get_inventory_type(type_id, db)
    db.delete(inventory_type)
    db.commit()
    return {"status": "ok"}
