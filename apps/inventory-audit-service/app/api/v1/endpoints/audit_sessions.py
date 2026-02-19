from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.clients import assert_room_access
from app.core.config import settings
from app.core.dependencies import (
    get_current_user,
    get_db,
    require_audit_auditor,
    require_audit_supervisor,
    require_system_admin,
    security,
)
from app.schemas import (
    AuditActionPublic,
    AuditDiscrepancyPublic,
    AuditExpectedItemPublic,
    AuditItemResultPublic,
    AuditScanCreate,
    AuditScanPublic,
    AuditSessionCreate,
    AuditSessionPublic,
)
from app.services import audit_session_service
from app.models.enums import AuditSessionStatus

router = APIRouter(prefix="/sessions", tags=["audit-sessions"])


@router.get("", response_model=list[AuditSessionPublic])
def list_sessions(
    location_id: int | None = Query(default=None),
    plan_id: int | None = Query(default=None),
    status_filter: AuditSessionStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[AuditSessionPublic]:
    return audit_session_service.list_sessions(
        db,
        location_id=location_id,
        plan_id=plan_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )


@router.get("/{session_id}", response_model=AuditSessionPublic)
def get_session(session_id: int, db: Session = Depends(get_db)) -> AuditSessionPublic:
    return audit_session_service.get_session(session_id, db)


@router.post("", response_model=AuditSessionPublic, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: AuditSessionCreate,
    current_user: dict[str, Any] = Depends(require_audit_auditor),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AuditSessionPublic:
    token = credentials.credentials
    assert_room_access(token=token, location_service_url=settings.location_service_url, room_id=payload.location_id)
    _ = current_user
    return audit_session_service.create_session(payload, db)


@router.post("/{session_id}/start", response_model=AuditSessionPublic)
def start_session(
    session_id: int,
    current_user: dict[str, Any] = Depends(require_audit_auditor),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AuditSessionPublic:
    token = credentials.credentials
    session = audit_session_service.get_session(session_id, db)
    assert_room_access(token=token, location_service_url=settings.location_service_url, room_id=session.location_id)

    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return audit_session_service.start_session(session_id, token=token, started_by=user_id, db=db)


@router.post("/{session_id}/scans", response_model=AuditScanPublic, status_code=status.HTTP_201_CREATED)
def create_scan(
    session_id: int,
    payload: AuditScanCreate,
    current_user: dict[str, Any] = Depends(require_audit_auditor),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AuditScanPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    token = credentials.credentials
    return audit_session_service.create_scan(
        session_id, payload, scanner_user_id=user_id, token=token, db=db
    )


@router.get("/{session_id}/expected", response_model=list[AuditExpectedItemPublic])
def list_expected(
    session_id: int,
    _current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditExpectedItemPublic]:
    return audit_session_service.list_expected_items(session_id, db)


@router.get("/{session_id}/results", response_model=list[AuditItemResultPublic])
def list_results(
    session_id: int,
    _current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditItemResultPublic]:
    return audit_session_service.list_item_results(session_id, db)


@router.get("/{session_id}/discrepancies", response_model=list[AuditDiscrepancyPublic])
def list_discrepancies(
    session_id: int,
    _current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditDiscrepancyPublic]:
    return audit_session_service.list_discrepancies(session_id, db)


@router.post("/{session_id}/close", response_model=AuditSessionPublic)
def close_session(
    session_id: int,
    current_user: dict[str, Any] = Depends(require_audit_auditor),
    db: Session = Depends(get_db),
) -> AuditSessionPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return audit_session_service.close_session(session_id, closed_by=user_id, db=db)


@router.post("/{session_id}/approve", response_model=AuditSessionPublic)
def approve_session(
    session_id: int,
    current_user: dict[str, Any] = Depends(require_audit_supervisor),
    db: Session = Depends(get_db),
) -> AuditSessionPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return audit_session_service.approve_session(session_id, approved_by=user_id, db=db)


@router.post("/{session_id}/build-actions", response_model=list[AuditActionPublic])
def build_actions(
    session_id: int,
    _current_user: dict[str, Any] = Depends(require_audit_supervisor),
    db: Session = Depends(get_db),
) -> list[AuditActionPublic]:
    return audit_session_service.build_actions_from_resolutions(session_id, db)


@router.get("/{session_id}/actions", response_model=list[AuditActionPublic])
def list_actions(
    session_id: int,
    _current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditActionPublic]:
    return audit_session_service.list_actions(session_id, db)


@router.post("/{session_id}/apply", response_model=AuditSessionPublic)
def apply_session(
    session_id: int,
    _current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AuditSessionPublic:
    token = credentials.credentials
    return audit_session_service.apply_session(session_id, token=token, db=db)
