from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, status
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_audit_auditor, require_audit_supervisor
from app.schemas import AuditPlanCreate, AuditPlanPublic, AuditPlanUpdate
from app.services import audit_plan_service

router = APIRouter(prefix="/plans", tags=["audit-plans"])


@router.get("", response_model=list[AuditPlanPublic])
def list_plans(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[AuditPlanPublic]:
    return audit_plan_service.list_plans(db, limit=limit, offset=offset)


@router.get("/{plan_id}", response_model=AuditPlanPublic)
def get_plan(plan_id: int, db: Session = Depends(get_db)) -> AuditPlanPublic:
    return audit_plan_service.get_plan(plan_id, db)


@router.post("", response_model=AuditPlanPublic, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: AuditPlanCreate,
    current_user: dict[str, Any] = Depends(require_audit_auditor),
    db: Session = Depends(get_db),
) -> AuditPlanPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return audit_plan_service.create_plan(payload, created_by=user_id, db=db)


@router.patch("/{plan_id}", response_model=AuditPlanPublic)
def update_plan(
    plan_id: int,
    payload: AuditPlanUpdate,
    _current_user: dict[str, Any] = Depends(require_audit_supervisor),
    db: Session = Depends(get_db),
) -> AuditPlanPublic:
    return audit_plan_service.update_plan(plan_id, payload, db)
