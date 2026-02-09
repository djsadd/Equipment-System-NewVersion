from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import departments

router = APIRouter()
router.include_router(departments.router)
