from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import InventoryAudit, InventoryItem
from app.schemas import InventoryAuditCreate


def list_audits(db: Session) -> list[InventoryAudit]:
    return db.execute(select(InventoryAudit).order_by(InventoryAudit.id)).scalars().all()


def get_audit(audit_id: int, db: Session) -> InventoryAudit:
    audit = db.get(InventoryAudit, audit_id)
    if not audit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="audit_not_found")
    return audit


def create_audit(payload: InventoryAuditCreate, db: Session) -> InventoryAudit:
    item = db.get(InventoryItem, payload.inventory_item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item_not_found")

    audited_at = payload.audited_at or datetime.now(timezone.utc)

    audit = InventoryAudit(
        inventory_item_id=payload.inventory_item_id,
        audited_at=audited_at,
        auditor_id=payload.auditor_id,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(audit)
    item.last_audit_at = audited_at
    db.commit()
    db.refresh(audit)
    return audit


def delete_audit(audit_id: int, db: Session) -> dict:
    audit = get_audit(audit_id, db)
    db.delete(audit)
    db.commit()
    return {"status": "ok"}
