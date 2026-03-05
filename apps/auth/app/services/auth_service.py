from __future__ import annotations

from datetime import datetime, timezone
import re
import secrets

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
from app.models import PlatonusProfile, RefreshToken, Role, User
from app.schemas import (
    LoginRequest,
    LogoutRequest,
    PlatonusLoginRequest,
    RefreshRequest,
    TokenPair,
    UserCreate,
    UserPublic,
)
from app.services import platonus_service

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
        iin=user.iin,
        person_id=user.person_id,
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
        iin=payload.iin,
        person_id=payload.person_id,
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


_IIN_RE = re.compile(r"\b\d{12}\b")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _deep_find_first(info: object, key_candidates: set[str]) -> str | None:
    if isinstance(info, dict):
        for key, value in info.items():
            if isinstance(key, str) and key.strip().lower() in key_candidates:
                if isinstance(value, str) and value.strip():
                    return value.strip()
                if value is not None and not isinstance(value, (dict, list)):
                    return str(value).strip()
            found = _deep_find_first(value, key_candidates)
            if found:
                return found
        return None
    if isinstance(info, list):
        for item in info:
            found = _deep_find_first(item, key_candidates)
            if found:
                return found
        return None
    return None


def _deep_find_regex(info: object, pattern: re.Pattern[str]) -> str | None:
    if isinstance(info, dict):
        for value in info.values():
            found = _deep_find_regex(value, pattern)
            if found:
                return found
        return None
    if isinstance(info, list):
        for item in info:
            found = _deep_find_regex(item, pattern)
            if found:
                return found
        return None
    if isinstance(info, str):
        match = pattern.search(info)
        return match.group(0) if match else None
    return None


def _extract_identity_fields(info: dict) -> dict[str, str | None]:
    iin = _deep_find_first(info, {"iin", "iin_number", "iinno", "iinnum", "iinid"})
    if not iin:
        iin = _deep_find_regex(info, _IIN_RE)
    if iin:
        iin = re.sub(r"\D", "", iin)
        if len(iin) != 12:
            iin = None

    email = _deep_find_first(info, {"email", "e-mail", "mail", "emailaddress", "email_address"})
    if email and not _EMAIL_RE.match(email):
        email = None

    full_name = _deep_find_first(info, {"fullname", "full_name", "fio", "name", "nameru", "name_ru"})
    first_name = _deep_find_first(info, {"firstname", "first_name", "name1", "givenname", "given_name"})
    last_name = _deep_find_first(info, {"lastname", "last_name", "surname", "familyname", "family_name"})

    return {
        "iin": iin,
        "email": email,
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
    }


def _generate_unique_email(*, base: str, db: Session) -> str:
    candidate = base
    for _ in range(20):
        existing = db.execute(select(User).where(User.email == candidate)).scalar_one_or_none()
        if not existing:
            return candidate
        suffix = secrets.token_hex(2)
        local, domain = candidate.split("@", 1)
        candidate = f"{local}.{suffix}@{domain}"
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_conflict")


def login_platonus_user(payload: PlatonusLoginRequest, db: Session) -> TokenPair:
    try:
        result = platonus_service.authenticate(payload.username, payload.password)
    except platonus_service.PlatonusAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    extracted = _extract_identity_fields(result.info)

    user = db.execute(select(User).where(User.person_id == result.person_id)).scalar_one_or_none()
    if not user and extracted.get("iin"):
        user = db.execute(select(User).where(User.iin == extracted["iin"])).scalar_one_or_none()
    if not user and extracted.get("email"):
        user = db.execute(select(User).where(User.email == extracted["email"])).scalar_one_or_none()

    if not user:
        email = extracted.get("email") or f"platonus-{result.person_id}@local.invalid"
        email = _generate_unique_email(base=email, db=db)
        random_password = secrets.token_urlsafe(32)[:72]
        user = User(
            email=email,
            password_hash=get_password_hash(random_password),
            full_name=extracted.get("full_name"),
            first_name=extracted.get("first_name"),
            last_name=extracted.get("last_name"),
            role=result.primary_role,
            iin=extracted.get("iin"),
            person_id=result.person_id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_inactive")
        user.person_id = result.person_id
        user.role = result.primary_role
        if extracted.get("iin"):
            user.iin = extracted["iin"]
        if extracted.get("full_name") and not user.full_name:
            user.full_name = extracted["full_name"]
        if extracted.get("first_name") and not user.first_name:
            user.first_name = extracted["first_name"]
        if extracted.get("last_name") and not user.last_name:
            user.last_name = extracted["last_name"]
        db.commit()

    profile = db.execute(select(PlatonusProfile).where(PlatonusProfile.user_id == user.id)).scalar_one_or_none()
    if not profile:
        profile = PlatonusProfile(
            user_id=user.id,
            username=result.username,
            person_id=result.person_id,
            primary_role=result.primary_role,
            roles=result.roles,
            info=result.info,
        )
        db.add(profile)
    else:
        profile.username = result.username
        profile.person_id = result.person_id
        profile.primary_role = result.primary_role
        profile.roles = result.roles
        profile.info = result.info
    db.commit()

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
