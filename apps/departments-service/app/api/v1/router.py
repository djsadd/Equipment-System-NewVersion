from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import departments, department_types

router = APIRouter()
router.include_router(department_types.router)
router.include_router(departments.router)
