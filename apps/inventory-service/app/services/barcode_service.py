from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import Barcode
from app.schemas import BarcodeCreate
from app.services.barcode_generation_service import (
    compute_ean13_check_digit,
    format_ean13_value,
    generate_ean13_png,
    generate_zpl,
)


def _normalize_value_for_response(barcode: Barcode) -> None:
    _ = barcode


def list_barcodes(db: Session) -> list[Barcode]:
    barcodes = db.execute(select(Barcode).order_by(Barcode.id)).scalars().all()
    for barcode in barcodes:
        _normalize_value_for_response(barcode)
    return barcodes


def get_barcode(barcode_id: int, db: Session) -> Barcode:
    barcode = db.get(Barcode, barcode_id)
    if not barcode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="barcode_not_found"
        )
    _normalize_value_for_response(barcode)
    return barcode


def create_barcode(payload: BarcodeCreate, db: Session, *, commit: bool = True) -> Barcode:
    normalized_value: str | None = None
    if payload.value is not None:
        raw = payload.value.strip()
        if not raw.isdigit() or len(raw) not in {12, 13}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="barcode_value_must_be_12_or_13_digits",
        )

        if len(raw) == 12:
            normalized_value = raw + compute_ean13_check_digit(raw)
        else:
            normalized_value = raw

        existing = db.execute(select(Barcode).where(Barcode.value == normalized_value)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="barcode_already_exists"
            )

    barcode = Barcode(value=normalized_value, title=payload.title)
    db.add(barcode)
    db.flush()  # assign barcode.id

    if barcode.value is None:
        barcode.value = format_ean13_value(barcode.id)

    barcode.image_filename = f"{barcode.id}.png"
    barcode.image_png = generate_ean13_png(value12=barcode.value, title=barcode.title)
    barcode.zpl_barcode = generate_zpl(value12=barcode.value, title=barcode.title)

    if commit:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="barcode_already_exists"
            )

        db.refresh(barcode)
    return barcode


def delete_barcode(barcode_id: int, db: Session) -> dict:
    barcode = get_barcode(barcode_id, db)
    db.delete(barcode)
    db.commit()
    return {"status": "ok"}
