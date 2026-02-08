from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Barcode
from app.schemas import BarcodeCreate


def list_barcodes(db: Session) -> list[Barcode]:
    return db.execute(select(Barcode).order_by(Barcode.id)).scalars().all()


def get_barcode(barcode_id: int, db: Session) -> Barcode:
    barcode = db.get(Barcode, barcode_id)
    if not barcode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="barcode_not_found"
        )
    return barcode


def create_barcode(payload: BarcodeCreate, db: Session) -> Barcode:
    existing = db.execute(select(Barcode).where(Barcode.value == payload.value)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="barcode_already_exists"
        )
    barcode = Barcode(value=payload.value)
    db.add(barcode)
    db.commit()
    db.refresh(barcode)
    return barcode


def delete_barcode(barcode_id: int, db: Session) -> dict:
    barcode = get_barcode(barcode_id, db)
    db.delete(barcode)
    db.commit()
    return {"status": "ok"}
