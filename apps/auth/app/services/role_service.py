from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Permission, Role
from app.schemas import (
    PermissionCreate,
    PermissionPublic,
    PermissionUpdate,
    RoleCreate,
    RolePermissionsUpdate,
    RolePublic,
    RoleUpdate,
)

SYSTEM_ADMIN_ROLE_NAME = settings.system_admin_role


def create_role(payload: RoleCreate, db: Session) -> RolePublic:
    existing = db.execute(select(Role).where(Role.name == payload.name)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="role_exists")

    role = Role(name=payload.name, description=payload.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return RolePublic.model_validate(role)


def list_roles(db: Session) -> list[RolePublic]:
    roles = db.execute(select(Role).order_by(Role.name)).scalars().all()
    return [RolePublic.model_validate(role) for role in roles]


def update_role(role_id: int, payload: RoleUpdate, db: Session) -> RolePublic:
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="role_not_found")

    if role.name == SYSTEM_ADMIN_ROLE_NAME and payload.name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="system_admin_protected",
        )

    if payload.name and payload.name != role.name:
        existing = db.execute(select(Role).where(Role.name == payload.name)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="role_exists")
        role.name = payload.name

    if payload.description is not None:
        role.description = payload.description

    db.commit()
    db.refresh(role)
    return RolePublic.model_validate(role)


def delete_role(role_id: int, db: Session) -> dict:
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="role_not_found")

    if role.name == SYSTEM_ADMIN_ROLE_NAME:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="system_admin_protected",
        )

    role.users = []
    role.permissions = []
    db.commit()
    db.delete(role)
    db.commit()
    return {"status": "ok"}


def create_permission(payload: PermissionCreate, db: Session) -> PermissionPublic:
    existing = db.execute(select(Permission).where(Permission.name == payload.name)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="permission_exists")

    permission = Permission(name=payload.name, description=payload.description)
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return PermissionPublic.model_validate(permission)


def list_permissions(db: Session) -> list[PermissionPublic]:
    permissions = db.execute(select(Permission).order_by(Permission.name)).scalars().all()
    return [PermissionPublic.model_validate(permission) for permission in permissions]


def update_permission(permission_id: int, payload: PermissionUpdate, db: Session) -> PermissionPublic:
    permission = db.get(Permission, permission_id)
    if not permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="permission_not_found")

    if payload.name and payload.name != permission.name:
        existing = db.execute(select(Permission).where(Permission.name == payload.name)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="permission_exists")
        permission.name = payload.name

    if payload.description is not None:
        permission.description = payload.description

    db.commit()
    db.refresh(permission)
    return PermissionPublic.model_validate(permission)


def delete_permission(permission_id: int, db: Session) -> dict:
    permission = db.get(Permission, permission_id)
    if not permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="permission_not_found")

    permission.roles = []
    db.commit()
    db.delete(permission)
    db.commit()
    return {"status": "ok"}


def update_role_permissions(
    role_id: int, payload: RolePermissionsUpdate, db: Session
) -> RolePublic:
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="role_not_found")

    if payload.permission_ids:
        permissions = (
            db.execute(select(Permission).where(Permission.id.in_(payload.permission_ids)))
            .scalars()
            .all()
        )
        if len(permissions) != len(set(payload.permission_ids)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="permission_not_found",
            )
    else:
        permissions = []

    role.permissions = permissions
    db.commit()
    db.refresh(role)
    return RolePublic.model_validate(role)
