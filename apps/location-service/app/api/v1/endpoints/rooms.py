from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_system_admin
from app.schemas.room import RoomCreate, RoomPublic, RoomUpdate
from app.services import room_service

router = APIRouter(
    prefix="/rooms",
    tags=["rooms"],
    dependencies=[Depends(require_system_admin)],
)

public_router = APIRouter(
    prefix="/rooms",
    tags=["rooms"],
)


@public_router.get("/my", response_model=list[RoomPublic])
def list_my_rooms(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RoomPublic]:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return room_service.list_rooms_for_user(user_id, db)


@public_router.get("/my/{room_id}", response_model=RoomPublic)
def get_my_room(
    room_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return room_service.get_room_for_user(room_id, user_id, db)


@router.get("", response_model=list[RoomPublic])
def list_rooms(db: Session = Depends(get_db)) -> list[RoomPublic]:
    return room_service.list_rooms(db)


@router.get("/{room_id}", response_model=RoomPublic)
def get_room(room_id: int, db: Session = Depends(get_db)) -> RoomPublic:
    return room_service.get_room(room_id, db)


@router.post("", response_model=RoomPublic, status_code=status.HTTP_201_CREATED)
def create_room(payload: RoomCreate, db: Session = Depends(get_db)) -> RoomPublic:
    return room_service.create_room(payload, db)


@router.put("/{room_id}", response_model=RoomPublic)
def update_room(room_id: int, payload: RoomUpdate, db: Session = Depends(get_db)) -> RoomPublic:
    return room_service.update_room(room_id, payload, db)


@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)) -> dict:
    return room_service.delete_room(room_id, db)
