from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenError(Exception):
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if len(plain_password.encode("utf-8")) > 72:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("password_too_long")
    return pwd_context.hash(password)


def _create_token(payload: dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = payload.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(
    user_id: int,
    roles: list[str] | None = None,
    permissions: list[str] | None = None,
) -> tuple[str, datetime]:
    expires = timedelta(minutes=settings.access_token_expires_minutes)
    payload: dict[str, Any] = {"sub": str(user_id), "type": "access"}
    if roles is not None:
        payload["roles"] = roles
    if permissions is not None:
        payload["permissions"] = permissions
    token = _create_token(payload, expires)
    return token, datetime.now(timezone.utc) + expires


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    expires = timedelta(days=settings.refresh_token_expires_days)
    jti = uuid4().hex
    token = _create_token({"sub": str(user_id), "type": "refresh", "jti": jti}, expires)
    return token, jti, datetime.now(timezone.utc) + expires


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise TokenError("invalid_token") from exc
