from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_audit_supervisor
from app.schemas import AuditDiscrepancyPublic, AuditDiscrepancyResolve
from app.services import audit_session_service

router = APIRouter(prefix="/discrepancies", tags=["audit-discrepancies"])


@router.post("/{discrepancy_id}/resolve", response_model=AuditDiscrepancyPublic)
def resolve_discrepancy(
    discrepancy_id: int,
    payload: AuditDiscrepancyResolve,
    _current_user: dict[str, Any] = Depends(require_audit_supervisor),
    db: Session = Depends(get_db),
) -> AuditDiscrepancyPublic:
    return audit_session_service.resolve_discrepancy(
        discrepancy_id,
        resolution_status=payload.resolution_status,
        resolution_payload=payload.resolution_payload,
        db=db,
    )

