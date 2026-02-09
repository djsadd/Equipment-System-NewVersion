from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_system_admin
from app.schemas.room_type import RoomTypeCreate, RoomTypePublic, RoomTypeUpdate
from app.services import room_type_service

router = APIRouter(
    prefix="/room-types",
    tags=["room-types"],
    dependencies=[Depends(require_system_admin)],
)


@router.get("", response_model=list[RoomTypePublic])
def list_room_types(db: Session = Depends(get_db)) -> list[RoomTypePublic]:
    return room_type_service.list_room_types(db)


@router.get("/{type_id}", response_model=RoomTypePublic)
def get_room_type(type_id: int, db: Session = Depends(get_db)) -> RoomTypePublic:
    return room_type_service.get_room_type(type_id, db)


@router.post("", response_model=RoomTypePublic, status_code=status.HTTP_201_CREATED)
def create_room_type(payload: RoomTypeCreate, db: Session = Depends(get_db)) -> RoomTypePublic:
    return room_type_service.create_room_type(payload, db)


@router.put("/{type_id}", response_model=RoomTypePublic)
def update_room_type(
    type_id: int, payload: RoomTypeUpdate, db: Session = Depends(get_db)
) -> RoomTypePublic:
    return room_type_service.update_room_type(type_id, payload, db)


@router.delete("/{type_id}")
def delete_room_type(type_id: int, db: Session = Depends(get_db)) -> dict:
    return room_type_service.delete_room_type(type_id, db)
