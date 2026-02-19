from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas import BarcodeCreate, BarcodePublic
from app.services import barcode_service

router = APIRouter(prefix="/barcodes", tags=["barcodes"])


@router.get("", response_model=list[BarcodePublic])
def list_barcodes(db: Session = Depends(get_db)) -> list[BarcodePublic]:
    return barcode_service.list_barcodes(db)


@router.get("/{barcode_id}", response_model=BarcodePublic)
def get_barcode(barcode_id: int, db: Session = Depends(get_db)) -> BarcodePublic:
    return barcode_service.get_barcode(barcode_id, db)


@router.post("", response_model=BarcodePublic, status_code=status.HTTP_201_CREATED)
def create_barcode(
    payload: BarcodeCreate, db: Session = Depends(get_db)
) -> BarcodePublic:
    return barcode_service.create_barcode(payload, db)


@router.get("/{barcode_id}/png")
def get_barcode_png(barcode_id: int, db: Session = Depends(get_db)) -> Response:
    barcode = barcode_service.get_barcode(barcode_id, db)
    if not barcode.image_png:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="barcode_image_not_found")
    filename = barcode.image_filename or f"{barcode.id}.png"
    return Response(
        content=barcode.image_png,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.delete("/{barcode_id}")
def delete_barcode(barcode_id: int, db: Session = Depends(get_db)) -> dict:
    return barcode_service.delete_barcode(barcode_id, db)
