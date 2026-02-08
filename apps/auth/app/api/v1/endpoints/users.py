from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_system_admin
from app.models import User
from app.schemas import AdminUserCreate, AdminUserUpdate, UserPublic, UserRolesUpdate
from app.services import user_service

router = APIRouter()


@router.put("/auth/users/{user_id}/roles", response_model=UserPublic)
@router.put("/admin/users/{user_id}/roles", response_model=UserPublic)
@router.put("/auth/admin/users/{user_id}/roles", response_model=UserPublic)
def update_user_roles(
    user_id: int,
    payload: UserRolesUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> UserPublic:
    return user_service.update_user_roles(user_id, payload, db)


@router.get("/auth/users", response_model=list[UserPublic])
@router.get("/admin/users", response_model=list[UserPublic])
@router.get("/auth/admin/users", response_model=list[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> list[UserPublic]:
    return user_service.list_users(db)


@router.get("/auth/users/{user_id}", response_model=UserPublic)
@router.get("/admin/users/{user_id}", response_model=UserPublic)
@router.get("/auth/admin/users/{user_id}", response_model=UserPublic)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> UserPublic:
    return user_service.get_user(user_id, db)


@router.post("/auth/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
@router.post("/admin/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
@router.post("/auth/admin/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> UserPublic:
    return user_service.create_user(payload, db)


@router.put("/auth/users/{user_id}", response_model=UserPublic)
@router.put("/admin/users/{user_id}", response_model=UserPublic)
@router.put("/auth/admin/users/{user_id}", response_model=UserPublic)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> UserPublic:
    return user_service.update_user(user_id, payload, db)


@router.delete("/auth/users/{user_id}")
@router.delete("/admin/users/{user_id}")
@router.delete("/auth/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_system_admin),
) -> dict:
    return user_service.delete_user(user_id, db)
