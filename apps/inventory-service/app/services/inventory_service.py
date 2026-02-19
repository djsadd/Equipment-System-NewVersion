from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError

from app.models import Barcode, InventoryItem, InventoryItemBarcode, InventoryType
from app.schemas import InventoryItemCreate, InventoryItemUpdate
from app.schemas.barcode import BarcodeCreate
from app.services import barcode_service


def list_items(db: Session) -> list[InventoryItem]:
    return (
        db.execute(
            select(InventoryItem)
            .options(selectinload(InventoryItem.barcodes))
            .order_by(InventoryItem.id)
        )
        .scalars()
        .all()
    )


def list_items_for_user(user_id: int, db: Session) -> list[InventoryItem]:
    return (
        db.execute(
            select(InventoryItem)
            .where(InventoryItem.responsible_id == user_id)
            .options(selectinload(InventoryItem.barcodes))
            .order_by(InventoryItem.id)
        )
        .scalars()
        .all()
    )


def list_items_for_location(location_id: int, db: Session) -> list[InventoryItem]:
    return (
        db.execute(
            select(InventoryItem)
            .where(InventoryItem.location_id == location_id)
            .options(selectinload(InventoryItem.barcodes))
            .order_by(InventoryItem.id)
        )
        .scalars()
        .all()
    )


def get_item(item_id: int, db: Session) -> InventoryItem:
    item = (
        db.execute(
            select(InventoryItem)
            .where(InventoryItem.id == item_id)
            .options(selectinload(InventoryItem.barcodes))
        )
        .scalar_one_or_none()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item_not_found")
    return item


def get_my_item_by_scanned_barcode_value(*, user_id: int, barcode_value: str, db: Session) -> InventoryItem:
    raw = str(barcode_value).strip()
    raw = "".join(raw.split())
    if not raw:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="barcode_value_required")

    payload11: str | None = None
    if raw.isdigit():
        if len(raw) == 13:
            payload11 = raw[1:12]
        elif len(raw) == 12:
            payload11 = raw[:11]
        elif len(raw) == 11:
            payload11 = raw

    print(f"[scan] barcode_value_raw={barcode_value!r} normalized={raw!r} payload11={payload11!r}")

    conditions = [Barcode.value == raw]
    if payload11:
        conditions.append(
            (func.length(Barcode.value) == 13) & (func.substr(Barcode.value, 2, 11) == payload11)
        )

    item = (
        db.execute(
            select(InventoryItem)
            .join(InventoryItemBarcode, InventoryItemBarcode.inventory_item_id == InventoryItem.id)
            .join(Barcode, Barcode.id == InventoryItemBarcode.barcode_id)
            .where(InventoryItem.responsible_id == user_id)
            .where(or_(*conditions))
            .options(selectinload(InventoryItem.barcodes))
            .limit(1)
        )
        .scalars()
        .first()
    )

    if not item:
        print(f"[scan] match_not_found user_id={user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item_not_found")

    print(f"[scan] matched item_id={item.id} user_id={user_id}")
    return item


def get_item_by_scanned_barcode_value(*, barcode_value: str, db: Session) -> InventoryItem:
    raw = str(barcode_value).strip()
    raw = "".join(raw.split())
    if not raw:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="barcode_value_required")

    payload11: str | None = None
    if raw.isdigit():
        if len(raw) == 13:
            payload11 = raw[1:12]
        elif len(raw) == 12:
            payload11 = raw[:11]
        elif len(raw) == 11:
            payload11 = raw

    conditions = [Barcode.value == raw]
    if payload11:
        conditions.append(
            (func.length(Barcode.value) == 13) & (func.substr(Barcode.value, 2, 11) == payload11)
        )

    item = (
        db.execute(
            select(InventoryItem)
            .join(InventoryItemBarcode, InventoryItemBarcode.inventory_item_id == InventoryItem.id)
            .join(Barcode, Barcode.id == InventoryItemBarcode.barcode_id)
            .where(or_(*conditions))
            .options(selectinload(InventoryItem.barcodes))
            .limit(1)
        )
        .scalars()
        .first()
    )

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
    db.flush()  # assign item.id

    if payload.barcode_id is not None:
        item.barcode_id = payload.barcode_id
        db.add(InventoryItemBarcode(inventory_item_id=item.id, barcode_id=payload.barcode_id))
    else:
        generated = barcode_service.create_barcode(
            BarcodeCreate(value=None, title=item.title),
            db,
            commit=False,
        )
        item.barcode_id = generated.id
        db.add(InventoryItemBarcode(inventory_item_id=item.id, barcode_id=generated.id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="barcode_already_exists"
        )

    return get_item(item.id, db)


def update_item(item_id: int, payload: InventoryItemUpdate, db: Session) -> InventoryItem:
    item = get_item(item_id, db)
    data = payload.model_dump(exclude_unset=True)

    if "barcode_id" in data and data["barcode_id"] is not None:
        barcode = db.get(Barcode, data["barcode_id"])
        if not barcode:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="barcode_not_found"
            )
        existing_link = (
            db.execute(
                select(InventoryItemBarcode).where(
                    InventoryItemBarcode.inventory_item_id == item.id,
                    InventoryItemBarcode.barcode_id == data["barcode_id"],
                )
            )
            .scalar_one_or_none()
        )
        if existing_link is None:
            db.add(
                InventoryItemBarcode(
                    inventory_item_id=item.id, barcode_id=data["barcode_id"]
                )
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
    return get_item(item.id, db)


def add_generated_barcode(item_id: int, db: Session, *, title: str | None = None) -> InventoryItem:
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item_not_found")

    generated = barcode_service.create_barcode(
        BarcodeCreate(value=None, title=title or item.title),
        db,
        commit=False,
    )
    db.add(InventoryItemBarcode(inventory_item_id=item.id, barcode_id=generated.id))
    db.commit()
    return get_item(item.id, db)


def delete_item(item_id: int, db: Session) -> dict:
    item = get_item(item_id, db)
    db.delete(item)
    db.commit()
    return {"status": "ok"}


def bulk_move_items(
    item_ids: list[int],
    *,
    location_id: int,
    responsible_id_is_set: bool,
    responsible_id: int | None,
    db: Session,
) -> tuple[list[InventoryItem], list[int], dict[int, tuple[int | None, int | None]]]:
    unique_ids: list[int] = []
    seen: set[int] = set()
    for item_id in item_ids:
        if item_id in seen:
            continue
        seen.add(item_id)
        unique_ids.append(item_id)

    items = (
        db.execute(
            select(InventoryItem)
            .where(InventoryItem.id.in_(unique_ids))
            .with_for_update()
        )
        .scalars()
        .all()
    )

    if not items:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="items_not_found")

    items_by_id = {item.id: item for item in items}
    missing_ids = [item_id for item_id in unique_ids if item_id not in items_by_id]

    previous_by_id: dict[int, tuple[int | None, int | None]] = {
        item.id: (item.location_id, item.responsible_id) for item in items
    }

    for item in items:
        item.location_id = location_id
        if responsible_id_is_set:
            item.responsible_id = responsible_id

    db.commit()
    for item in items:
        db.refresh(item)

    return items, missing_ids, previous_by_id
