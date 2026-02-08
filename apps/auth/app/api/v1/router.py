from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import auth, roles, users

router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(roles.router)
