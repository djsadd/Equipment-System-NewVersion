from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_system_admin, security
from app.schemas.department import (
    DepartmentCreate,
    DepartmentPublic,
    DepartmentUpdate,
    DepartmentUserPublic,
)
from app.services import department_service, department_user_service

router = APIRouter(
    prefix="/departments",
    tags=["departments"],
    dependencies=[Depends(require_system_admin)],
)


@router.get("", response_model=list[DepartmentPublic])
def list_departments(db: Session = Depends(get_db)) -> list[DepartmentPublic]:
    return department_service.list_departments(db)


@router.get("/{department_id}", response_model=DepartmentPublic)
def get_department(department_id: int, db: Session = Depends(get_db)) -> DepartmentPublic:
    return department_service.get_department(department_id, db)


@router.post("", response_model=DepartmentPublic, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate, db: Session = Depends(get_db)
) -> DepartmentPublic:
    return department_service.create_department(payload, db)


@router.put("/{department_id}", response_model=DepartmentPublic)
def update_department(
    department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)
) -> DepartmentPublic:
    return department_service.update_department(department_id, payload, db)


@router.delete("/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)) -> dict:
    return department_service.delete_department(department_id, db)


@router.get("/{department_id}/users", response_model=list[DepartmentUserPublic])
async def list_department_users(
    department_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> list[DepartmentUserPublic]:
    department_service.require_department(department_id, db)
    token = credentials.credentials
    return await department_user_service.list_users_for_department(department_id, token)


@router.put("/{department_id}/users/{user_id}", response_model=DepartmentUserPublic)
async def assign_user(
    department_id: int,
    user_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> DepartmentUserPublic:
    department_service.require_department(department_id, db)
    token = credentials.credentials
    return await department_user_service.assign_user_to_department(
        department_id, user_id, token
    )


@router.delete("/{department_id}/users/{user_id}", response_model=DepartmentUserPublic)
async def unassign_user(
    department_id: int,
    user_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> DepartmentUserPublic:
    department_service.require_department(department_id, db)
    token = credentials.credentials
    result = await department_user_service.unassign_user_from_department(user_id, token)
    if result.department_id not in (None, department_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="department_mismatch"
        )
    return result
