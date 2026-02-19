from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import inventory_events
from app.api.v1.endpoints import print as print_endpoints

router = APIRouter()
router.include_router(inventory_events.router)
router.include_router(print_endpoints.router)
