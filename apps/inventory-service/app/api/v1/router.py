from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import audit, barcode, inventory, inventory_type

router = APIRouter()
router.include_router(inventory.router)
router.include_router(barcode.router)
router.include_router(inventory_type.router)
router.include_router(audit.router)
