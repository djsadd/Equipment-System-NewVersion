from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Room, RoomType
from app.schemas.room_type import RoomTypeCreate, RoomTypePublic, RoomTypeUpdate


def list_room_types(db: Session) -> list[RoomTypePublic]:
    counts = dict(
        db.execute(
            select(Room.room_type, func.count(Room.id)).group_by(Room.room_type)
        ).all()
    )
    types = db.execute(select(RoomType).order_by(RoomType.name)).scalars().all()
    return [
        RoomTypePublic(
            id=item.id,
            name=item.name,
            status=item.status,
            count=int(counts.get(item.name, 0) or 0),
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in types
    ]


def get_room_type(type_id: int, db: Session) -> RoomTypePublic:
    item = db.get(RoomType, type_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="room_type_not_found")
    count = db.execute(
        select(func.count(Room.id)).where(Room.room_type == item.name)
    ).scalar_one()
    return RoomTypePublic(
        id=item.id,
        name=item.name,
        status=item.status,
        count=int(count or 0),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def create_room_type(payload: RoomTypeCreate, db: Session) -> RoomTypePublic:
    exists = db.execute(select(RoomType).where(RoomType.name == payload.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="room_type_exists")

    item = RoomType(name=payload.name, status=payload.status or "Активен")
    db.add(item)
    db.commit()
    db.refresh(item)
    return RoomTypePublic(
        id=item.id,
        name=item.name,
        status=item.status,
        count=0,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def update_room_type(type_id: int, payload: RoomTypeUpdate, db: Session) -> RoomTypePublic:
    item = db.get(RoomType, type_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="room_type_not_found")

    if payload.name and payload.name != item.name:
        exists = db.execute(select(RoomType).where(RoomType.name == payload.name)).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="room_type_exists")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    count = db.execute(
        select(func.count(Room.id)).where(Room.room_type == item.name)
    ).scalar_one()
    return RoomTypePublic(
        id=item.id,
        name=item.name,
        status=item.status,
        count=int(count or 0),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def delete_room_type(type_id: int, db: Session) -> dict:
    item = db.get(RoomType, type_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="room_type_not_found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
