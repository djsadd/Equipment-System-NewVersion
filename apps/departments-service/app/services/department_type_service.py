from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Department, DepartmentType
from app.schemas.department_type import (
    DepartmentTypeCreate,
    DepartmentTypePublic,
    DepartmentTypeUpdate,
)


def list_department_types(db: Session) -> list[DepartmentTypePublic]:
    counts = dict(
        db.execute(
            select(Department.department_type_id, func.count(Department.id)).group_by(
                Department.department_type_id
            )
        ).all()
    )
    types = db.execute(select(DepartmentType).order_by(DepartmentType.name)).scalars().all()
    return [
        DepartmentTypePublic(
            id=item.id,
            name=item.name,
            status=item.status,
            count=int(counts.get(item.id, 0) or 0),
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in types
    ]


def get_department_type(type_id: int, db: Session) -> DepartmentTypePublic:
    item = db.get(DepartmentType, type_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="department_type_not_found"
        )
    count = db.execute(
        select(func.count(Department.id)).where(Department.department_type_id == item.id)
    ).scalar_one()
    return DepartmentTypePublic(
        id=item.id,
        name=item.name,
        status=item.status,
        count=int(count or 0),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def create_department_type(payload: DepartmentTypeCreate, db: Session) -> DepartmentTypePublic:
    exists = db.execute(
        select(DepartmentType).where(DepartmentType.name == payload.name)
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="department_type_exists")

    item = DepartmentType(name=payload.name, status=payload.status or "Активен")
    db.add(item)
    db.commit()
    db.refresh(item)
    return DepartmentTypePublic(
        id=item.id,
        name=item.name,
        status=item.status,
        count=0,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def update_department_type(
    type_id: int, payload: DepartmentTypeUpdate, db: Session
) -> DepartmentTypePublic:
    item = db.get(DepartmentType, type_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="department_type_not_found"
        )

    if payload.name and payload.name != item.name:
        exists = db.execute(
            select(DepartmentType).where(DepartmentType.name == payload.name)
        ).scalar_one_or_none()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="department_type_exists"
            )

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    count = db.execute(
        select(func.count(Department.id)).where(Department.department_type_id == item.id)
    ).scalar_one()
    return DepartmentTypePublic(
        id=item.id,
        name=item.name,
        status=item.status,
        count=int(count or 0),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def delete_department_type(type_id: int, db: Session) -> dict:
    item = db.get(DepartmentType, type_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="department_type_not_found"
        )
    db.delete(item)
    db.commit()
    return {"status": "deleted"}

