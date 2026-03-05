from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import documents, templates, types

router = APIRouter(prefix="/v1")
router.include_router(types.router)
router.include_router(templates.router)
router.include_router(documents.router)

