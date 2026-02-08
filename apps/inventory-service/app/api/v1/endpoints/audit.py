from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas import InventoryAuditCreate, InventoryAuditPublic
from app.services import audit_service

router = APIRouter(prefix="/audits", tags=["audits"])


@router.get("", response_model=list[InventoryAuditPublic])
def list_audits(db: Session = Depends(get_db)) -> list[InventoryAuditPublic]:
    return audit_service.list_audits(db)


@router.get("/{audit_id}", response_model=InventoryAuditPublic)
def get_audit(audit_id: int, db: Session = Depends(get_db)) -> InventoryAuditPublic:
    return audit_service.get_audit(audit_id, db)


@router.post("", response_model=InventoryAuditPublic, status_code=status.HTTP_201_CREATED)
def create_audit(
    payload: InventoryAuditCreate, db: Session = Depends(get_db)
) -> InventoryAuditPublic:
    return audit_service.create_audit(payload, db)


@router.delete("/{audit_id}")
def delete_audit(audit_id: int, db: Session = Depends(get_db)) -> dict:
    return audit_service.delete_audit(audit_id, db)
