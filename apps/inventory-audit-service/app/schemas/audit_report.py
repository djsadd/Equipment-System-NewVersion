from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.enums import AuditSessionStatus


class AuditReportDiscrepancyTotals(BaseModel):
    total: int
    open: int
    resolved: int
    ignored: int


class AuditReportSessionRow(BaseModel):
    session_id: int
    location_id: int
    status: AuditSessionStatus

    started_at: datetime | None = None
    closed_at: datetime | None = None
    approved_at: datetime | None = None
    applied_at: datetime | None = None
    updated_at: datetime | None = None

    expected_total: int
    scan_count: int

    found_total: int
    found_in_place: int
    found_wrong_location: int
    missing: int

    found_rate: float
    in_place_rate: float

    unexpected: int
    duplicate: int
    unknown_barcode: int

    discrepancies: AuditReportDiscrepancyTotals


class AuditReportPlanSummary(BaseModel):
    plan_id: int
    generated_at: datetime

    rooms_total: int
    rooms_done: int

    expected_total: int
    scan_count: int

    found_total: int
    found_in_place: int
    found_wrong_location: int
    missing: int

    found_rate: float
    in_place_rate: float

    unexpected: int
    duplicate: int
    unknown_barcode: int

    discrepancies: AuditReportDiscrepancyTotals

    sessions: list[AuditReportSessionRow]

