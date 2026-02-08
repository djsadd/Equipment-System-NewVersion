from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.db import SessionLocal
from app.models import RefreshToken, Role, User
from app.schemas import LoginRequest, LogoutRequest, RefreshRequest, TokenPair, UserCreate, UserPublic

SYSTEM_ADMIN_ROLE_NAME = settings.system_admin_role
SYSTEM_ADMIN_ROLE_DESCRIPTION = "Администратор системы"


def ensure_system_admin_role() -> None:
    db = SessionLocal()
    try:
        existing = db.execute(
            select(Role).where(Role.name == SYSTEM_ADMIN_ROLE_NAME)
        ).scalar_one_or_none()
        if not existing:
            role = Role(
                name=SYSTEM_ADMIN_ROLE_NAME,
                description=SYSTEM_ADMIN_ROLE_DESCRIPTION,
            )
            db.add(role)
            db.commit()
    finally:
        db.close()


def collect_roles_permissions(user: User | None) -> tuple[list[str], list[str]]:
    if not user:
        return [], []
    role_names = {role.name for role in user.roles}
    permission_names: set[str] = set()
    for role in user.roles:
        permission_names.update(permission.name for permission in role.permissions)
    return sorted(role_names), sorted(permission_names)


def user_public_from_model(user: User) -> UserPublic:
    roles, permissions = collect_roles_permissions(user)
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        first_name=user.first_name,
        last_name=user.last_name,
        department_id=user.department_id,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        roles=roles,
        permissions=permissions,
    )


def issue_tokens(db: Session, user_id: int) -> TokenPair:
    user = db.get(User, user_id)
    roles, permissions = collect_roles_permissions(user)
    access_token, access_expires_at = create_access_token(
        user_id, roles=roles, permissions=permissions
    )
    refresh_token, jti, refresh_expires_at = create_refresh_token(user_id)

    db_token = RefreshToken(
        user_id=user_id,
        jti=jti,
        expires_at=refresh_expires_at,
    )
    db.add(db_token)
    db.commit()

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        access_expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
    )


def register_user(payload: UserCreate, db: Session) -> UserPublic:
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
    )
    try:
        user.password_hash = get_password_hash(payload.password)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="password_too_long",
        )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_public_from_model(user)


def login_user(payload: LoginRequest, db: Session) -> TokenPair:
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_inactive")

    return issue_tokens(db, user.id)


def refresh_tokens(payload: RefreshRequest, db: Session) -> TokenPair:
    try:
        token_payload = decode_token(payload.refresh_token)
    except TokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    user_id = token_payload.get("sub")
    jti = token_payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    db_token = db.execute(
        select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.user_id == int(user_id),
        )
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if not db_token or db_token.revoked or db_token.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh_expired")

    db_token.revoked = True
    db.commit()

    return issue_tokens(db, int(user_id))


def logout_user(payload: LogoutRequest, db: Session) -> dict:
    try:
        token_payload = decode_token(payload.refresh_token)
    except TokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    jti = token_payload.get("jti")
    if not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    db_token = db.execute(select(RefreshToken).where(RefreshToken.jti == jti)).scalar_one_or_none()
    if db_token and not db_token.revoked:
        db_token.revoked = True
        db.commit()

    return {"status": "ok"}
