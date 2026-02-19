from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import internal, notifications

router = APIRouter()
router.include_router(notifications.router)
router.include_router(internal.router)

