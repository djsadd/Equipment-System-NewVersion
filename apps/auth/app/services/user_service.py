from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import Role, User
from app.schemas import AdminUserCreate, AdminUserUpdate, UserPublic, UserRolesUpdate
from app.services.auth_service import user_public_from_model


def update_user_roles(user_id: int, payload: UserRolesUpdate, db: Session) -> UserPublic:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    if payload.role_ids:
        roles = db.execute(select(Role).where(Role.id.in_(payload.role_ids))).scalars().all()
        if len(roles) != len(set(payload.role_ids)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="role_not_found")
    else:
        roles = []

    user.roles = roles
    db.commit()
    db.refresh(user)
    return user_public_from_model(user)


def list_users(db: Session) -> list[UserPublic]:
    users = db.execute(select(User).order_by(User.created_at.desc())).scalars().all()
    return [user_public_from_model(user) for user in users]


def get_user(user_id: int, db: Session) -> UserPublic:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")
    return user_public_from_model(user)


def create_user(payload: AdminUserCreate, db: Session) -> UserPublic:
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_already_registered")

    user = User(
        email=payload.email,
        password_hash="",
        full_name=payload.full_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
        department_id=payload.department_id,
        role=payload.role,
        is_active=payload.is_active,
    )
    try:
        user.password_hash = get_password_hash(payload.password)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="password_too_long",
        )

    if payload.role_ids:
        roles = db.execute(select(Role).where(Role.id.in_(payload.role_ids))).scalars().all()
        if len(roles) != len(set(payload.role_ids)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="role_not_found")
        user.roles = roles

    db.add(user)
    db.commit()
    db.refresh(user)
    return user_public_from_model(user)


def update_user(user_id: int, payload: AdminUserUpdate, db: Session) -> UserPublic:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    if payload.email and payload.email != user.email:
        existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_already_registered")
        user.email = payload.email

    if payload.password:
        try:
            user.password_hash = get_password_hash(payload.password)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="password_too_long",
            )

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.department_id is not None:
        user.department_id = payload.department_id
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.role_ids is not None:
        if payload.role_ids:
            roles = db.execute(select(Role).where(Role.id.in_(payload.role_ids))).scalars().all()
            if len(roles) != len(set(payload.role_ids)):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="role_not_found")
            user.roles = roles
        else:
            user.roles = []

    db.commit()
    db.refresh(user)
    return user_public_from_model(user)


def delete_user(user_id: int, db: Session) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    user.roles = []
    db.commit()
    db.delete(user)
    db.commit()
    return {"status": "ok"}
