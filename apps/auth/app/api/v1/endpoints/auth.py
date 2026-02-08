from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import LoginRequest, LogoutRequest, RefreshRequest, TokenPair, UserCreate, UserPublic
from app.services import auth_service

router = APIRouter()


@router.post("/auth/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserPublic:
    return auth_service.register_user(payload, db)


@router.post("/auth/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    return auth_service.login_user(payload, db)


@router.post("/auth/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    return auth_service.refresh_tokens(payload, db)


@router.post("/auth/logout")
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> dict:
    return auth_service.logout_user(payload, db)


@router.get("/auth/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return auth_service.user_public_from_model(current_user)
