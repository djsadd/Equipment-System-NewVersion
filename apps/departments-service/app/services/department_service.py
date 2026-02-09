from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Department
from app.schemas.department import DepartmentCreate, DepartmentPublic, DepartmentUpdate


def list_departments(db: Session) -> list[DepartmentPublic]:
    departments = db.execute(select(Department).order_by(Department.name)).scalars().all()
    return [DepartmentPublic.model_validate(department) for department in departments]


def get_department(department_id: int, db: Session) -> DepartmentPublic:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="department_not_found"
        )
    return DepartmentPublic.model_validate(department)


def require_department(department_id: int, db: Session) -> Department:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="department_not_found"
        )
    return department


def create_department(payload: DepartmentCreate, db: Session) -> DepartmentPublic:
    department = Department(
        name=payload.name,
        location_id=payload.location_id,
        status=payload.status or "Активен",
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    return DepartmentPublic.model_validate(department)


def update_department(
    department_id: int, payload: DepartmentUpdate, db: Session
) -> DepartmentPublic:
    department = require_department(department_id, db)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(department, field, value)
    db.commit()
    db.refresh(department)
    return DepartmentPublic.model_validate(department)


def delete_department(department_id: int, db: Session) -> dict:
    department = require_department(department_id, db)
    db.delete(department)
    db.commit()
    return {"status": "deleted"}
