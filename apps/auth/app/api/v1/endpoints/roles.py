from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_system_admin
from app.models import User
from app.schemas import (
    PermissionCreate,
    PermissionPublic,
    PermissionUpdate,
    RoleCreate,
    RolePermissionsUpdate,
    RolePublic,
    RoleUpdate,
)
from app.services import role_service

router = APIRouter()


@router.post("/auth/roles", response_model=RolePublic, status_code=status.HTTP_201_CREATED)
@router.post("/admin/roles", response_model=RolePublic, status_code=status.HTTP_201_CREATED)
@router.post("/auth/admin/roles", response_model=RolePublic, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> RolePublic:
    return role_service.create_role(payload, db)


@router.get("/auth/roles", response_model=list[RolePublic])
@router.get("/admin/roles", response_model=list[RolePublic])
@router.get("/auth/admin/roles", response_model=list[RolePublic])
def list_roles(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> list[RolePublic]:
    return role_service.list_roles(db)


@router.put("/auth/roles/{role_id}", response_model=RolePublic)
@router.put("/admin/roles/{role_id}", response_model=RolePublic)
@router.put("/auth/admin/roles/{role_id}", response_model=RolePublic)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> RolePublic:
    return role_service.update_role(role_id, payload, db)


@router.delete("/auth/roles/{role_id}")
@router.delete("/admin/roles/{role_id}")
@router.delete("/auth/admin/roles/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> dict:
    return role_service.delete_role(role_id, db)


@router.post(
    "/auth/permissions",
    response_model=PermissionPublic,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/admin/permissions",
    response_model=PermissionPublic,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/auth/admin/permissions",
    response_model=PermissionPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_permission(
    payload: PermissionCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> PermissionPublic:
    return role_service.create_permission(payload, db)


@router.get("/auth/permissions", response_model=list[PermissionPublic])
@router.get("/admin/permissions", response_model=list[PermissionPublic])
@router.get("/auth/admin/permissions", response_model=list[PermissionPublic])
def list_permissions(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> list[PermissionPublic]:
    return role_service.list_permissions(db)


@router.put("/auth/permissions/{permission_id}", response_model=PermissionPublic)
@router.put("/admin/permissions/{permission_id}", response_model=PermissionPublic)
@router.put("/auth/admin/permissions/{permission_id}", response_model=PermissionPublic)
def update_permission(
    permission_id: int,
    payload: PermissionUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> PermissionPublic:
    return role_service.update_permission(permission_id, payload, db)


@router.delete("/auth/permissions/{permission_id}")
@router.delete("/admin/permissions/{permission_id}")
@router.delete("/auth/admin/permissions/{permission_id}")
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> dict:
    return role_service.delete_permission(permission_id, db)


@router.put("/auth/roles/{role_id}/permissions", response_model=RolePublic)
@router.put("/admin/roles/{role_id}/permissions", response_model=RolePublic)
@router.put("/auth/admin/roles/{role_id}/permissions", response_model=RolePublic)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> RolePublic:
    return role_service.update_role_permissions(role_id, payload, db)
