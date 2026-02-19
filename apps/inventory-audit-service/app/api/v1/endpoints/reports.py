from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_audit_supervisor
from app.schemas import AuditReportPlanSummary
from app.services import audit_report_service

router = APIRouter(prefix="/reports", tags=["audit-reports"])


@router.get("/plans/{plan_id}", response_model=AuditReportPlanSummary)
def get_plan_report(
    plan_id: int,
    _current_user: dict = Depends(require_audit_supervisor),
    db: Session = Depends(get_db),
) -> AuditReportPlanSummary:
    return audit_report_service.get_plan_report(plan_id, db)

