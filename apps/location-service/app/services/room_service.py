from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Room
from app.schemas.room import RoomCreate, RoomPublic, RoomUpdate


def list_rooms(db: Session) -> list[RoomPublic]:
    rooms = db.execute(select(Room).order_by(Room.name)).scalars().all()
    return [RoomPublic.model_validate(room) for room in rooms]


def list_rooms_for_user(user_id: int, db: Session) -> list[RoomPublic]:
    rooms = (
        db.execute(
            select(Room).where(Room.responsible_id == user_id).order_by(Room.name)
        )
        .scalars()
        .all()
    )
    return [RoomPublic.model_validate(room) for room in rooms]


def get_room_for_user(room_id: int, user_id: int, db: Session) -> RoomPublic:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="room_not_found")
    if room.responsible_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="room_forbidden")
    return RoomPublic.model_validate(room)


def get_room(room_id: int, db: Session) -> RoomPublic:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="room_not_found")
    return RoomPublic.model_validate(room)


def create_room(payload: RoomCreate, db: Session) -> RoomPublic:
    room = Room(
        name=payload.name,
        room_type=payload.room_type,
        responsible_id=payload.responsible_id,
        status=payload.status or "Активен",
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return RoomPublic.model_validate(room)


def update_room(room_id: int, payload: RoomUpdate, db: Session) -> RoomPublic:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="room_not_found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(room, field, value)

    db.commit()
    db.refresh(room)
    return RoomPublic.model_validate(room)


def delete_room(room_id: int, db: Session) -> dict:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="room_not_found")
    db.delete(room)
    db.commit()
    return {"status": "deleted"}
