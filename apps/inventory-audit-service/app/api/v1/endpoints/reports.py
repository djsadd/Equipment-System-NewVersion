from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_audit_supervisor, security
from app.schemas import AuditReportPlanSummary
from app.services import audit_report_service

router = APIRouter(prefix="/reports", tags=["audit-reports"])


@router.get("/plans/{plan_id}", response_model=AuditReportPlanSummary)
def get_plan_report(
    plan_id: int,
    _current_user: dict = Depends(require_audit_supervisor),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AuditReportPlanSummary:
    token = credentials.credentials
    return audit_report_service.get_plan_report(plan_id, db, token=token)
