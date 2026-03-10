from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_system_admin
from app.schemas.department_type import (
    DepartmentTypeCreate,
    DepartmentTypePublic,
    DepartmentTypeUpdate,
)
from app.services import department_type_service

router = APIRouter(
    prefix="/departments/types",
    tags=["department-types"],
    dependencies=[Depends(require_system_admin)],
)


@router.get("", response_model=list[DepartmentTypePublic])
def list_department_types(db: Session = Depends(get_db)) -> list[DepartmentTypePublic]:
    return department_type_service.list_department_types(db)


@router.get("/{type_id}", response_model=DepartmentTypePublic)
def get_department_type(type_id: int, db: Session = Depends(get_db)) -> DepartmentTypePublic:
    return department_type_service.get_department_type(type_id, db)


@router.post("", response_model=DepartmentTypePublic, status_code=status.HTTP_201_CREATED)
def create_department_type(
    payload: DepartmentTypeCreate, db: Session = Depends(get_db)
) -> DepartmentTypePublic:
    return department_type_service.create_department_type(payload, db)


@router.put("/{type_id}", response_model=DepartmentTypePublic)
def update_department_type(
    type_id: int, payload: DepartmentTypeUpdate, db: Session = Depends(get_db)
) -> DepartmentTypePublic:
    return department_type_service.update_department_type(type_id, payload, db)


@router.delete("/{type_id}")
def delete_department_type(type_id: int, db: Session = Depends(get_db)) -> dict:
    return department_type_service.delete_department_type(type_id, db)

