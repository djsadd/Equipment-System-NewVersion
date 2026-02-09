from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import room_types, rooms

router = APIRouter()
router.include_router(rooms.public_router)
router.include_router(rooms.router)
router.include_router(room_types.router)
