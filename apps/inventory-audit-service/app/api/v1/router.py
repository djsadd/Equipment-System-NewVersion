from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import audit_discrepancies, audit_plans, audit_sessions, reports

router = APIRouter()
router.include_router(audit_plans.router)
router.include_router(audit_sessions.router)
router.include_router(audit_discrepancies.router)
router.include_router(reports.router)
