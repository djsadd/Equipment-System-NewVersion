from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditDiscrepancy, AuditItemResult, AuditScan, AuditSession
from app.models.enums import (
    AuditItemResultStatus,
    AuditSessionStatus,
    DiscrepancyType,
    ResolutionStatus,
)
from app.schemas.audit_report import (
    AuditReportDiscrepancyTotals,
    AuditReportPlanSummary,
    AuditReportSessionRow,
)


def _safe_rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return float(numerator) / float(denominator)


def get_plan_report(plan_id: int, db: Session) -> AuditReportPlanSummary:
    sessions = (
        db.execute(
            select(AuditSession).where(AuditSession.plan_id == plan_id).order_by(AuditSession.location_id.asc())
        )
        .scalars()
        .all()
    )

    if not sessions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="plan_not_found_or_empty")

    session_ids = [s.id for s in sessions]

    # item result counts by status
    result_counts: dict[int, dict[AuditItemResultStatus, int]] = defaultdict(dict)
    for session_id, status_value, count_value in db.execute(
        select(AuditItemResult.session_id, AuditItemResult.status, func.count(AuditItemResult.id))
        .where(AuditItemResult.session_id.in_(session_ids))
        .group_by(AuditItemResult.session_id, AuditItemResult.status)
    ).all():
        result_counts[int(session_id)][status_value] = int(count_value)

    # scan counts
    scan_counts: dict[int, int] = {}
    for session_id, count_value in db.execute(
        select(AuditScan.session_id, func.count(AuditScan.id))
        .where(AuditScan.session_id.in_(session_ids))
        .group_by(AuditScan.session_id)
    ).all():
        scan_counts[int(session_id)] = int(count_value)

    # discrepancies by type + resolution
    discrepancy_counts: dict[int, dict[tuple[DiscrepancyType, ResolutionStatus], int]] = defaultdict(dict)
    for session_id, type_value, resolution_value, count_value in db.execute(
        select(
            AuditDiscrepancy.session_id,
            AuditDiscrepancy.type,
            AuditDiscrepancy.resolution_status,
            func.count(AuditDiscrepancy.id),
        )
        .where(AuditDiscrepancy.session_id.in_(session_ids))
        .group_by(AuditDiscrepancy.session_id, AuditDiscrepancy.type, AuditDiscrepancy.resolution_status)
    ).all():
        discrepancy_counts[int(session_id)][(type_value, resolution_value)] = int(count_value)

    session_rows: list[AuditReportSessionRow] = []

    totals_rooms_done = 0
    totals_expected = 0
    totals_scans = 0
    totals_found = 0
    totals_in_place = 0
    totals_wrong_location = 0
    totals_missing = 0
    totals_unexpected = 0
    totals_duplicate = 0
    totals_unknown_barcode = 0
    totals_discrepancies_total = 0
    totals_discrepancies_open = 0
    totals_discrepancies_resolved = 0
    totals_discrepancies_ignored = 0

    done_statuses = {AuditSessionStatus.applied, AuditSessionStatus.closed}

    for s in sessions:
        is_done = s.status in done_statuses
        if is_done:
            totals_rooms_done += 1

        counts = result_counts.get(s.id, {})
        missing = counts.get(AuditItemResultStatus.missing, 0)
        found_in_place = counts.get(AuditItemResultStatus.found_in_place, 0)
        found_wrong_location = counts.get(AuditItemResultStatus.found, 0)
        expected_total = missing + found_in_place + found_wrong_location
        found_total = found_in_place + found_wrong_location
        scan_count = scan_counts.get(s.id, 0)

        unexpected = sum(
            c
            for (dtype, _rstatus), c in discrepancy_counts.get(s.id, {}).items()
            if dtype == DiscrepancyType.unexpected
        )
        duplicate = sum(
            c
            for (dtype, _rstatus), c in discrepancy_counts.get(s.id, {}).items()
            if dtype == DiscrepancyType.duplicate
        )
        unknown_barcode = sum(
            c
            for (dtype, _rstatus), c in discrepancy_counts.get(s.id, {}).items()
            if dtype == DiscrepancyType.unknown_barcode
        )

        disc_total = sum(discrepancy_counts.get(s.id, {}).values())
        disc_open = sum(
            c
            for (_dtype, rstatus), c in discrepancy_counts.get(s.id, {}).items()
            if rstatus == ResolutionStatus.open
        )
        disc_resolved = sum(
            c
            for (_dtype, rstatus), c in discrepancy_counts.get(s.id, {}).items()
            if rstatus == ResolutionStatus.resolved
        )
        disc_ignored = sum(
            c
            for (_dtype, rstatus), c in discrepancy_counts.get(s.id, {}).items()
            if rstatus == ResolutionStatus.ignored
        )

        session_rows.append(
            AuditReportSessionRow(
                session_id=s.id,
                location_id=s.location_id,
                status=s.status,
                started_at=s.started_at,
                closed_at=s.closed_at,
                approved_at=s.approved_at,
                applied_at=s.applied_at,
                updated_at=s.updated_at,
                expected_total=expected_total,
                scan_count=scan_count,
                found_total=found_total,
                found_in_place=found_in_place,
                found_wrong_location=found_wrong_location,
                missing=missing,
                found_rate=_safe_rate(found_total, expected_total),
                in_place_rate=_safe_rate(found_in_place, expected_total),
                unexpected=unexpected,
                duplicate=duplicate,
                unknown_barcode=unknown_barcode,
                discrepancies=AuditReportDiscrepancyTotals(
                    total=disc_total,
                    open=disc_open,
                    resolved=disc_resolved,
                    ignored=disc_ignored,
                ),
            )
        )

        totals_expected += expected_total
        totals_scans += scan_count
        totals_found += found_total
        totals_in_place += found_in_place
        totals_wrong_location += found_wrong_location
        totals_missing += missing
        totals_unexpected += unexpected
        totals_duplicate += duplicate
        totals_unknown_barcode += unknown_barcode
        totals_discrepancies_total += disc_total
        totals_discrepancies_open += disc_open
        totals_discrepancies_resolved += disc_resolved
        totals_discrepancies_ignored += disc_ignored

    return AuditReportPlanSummary(
        plan_id=plan_id,
        generated_at=datetime.now(timezone.utc),
        rooms_total=len(sessions),
        rooms_done=totals_rooms_done,
        expected_total=totals_expected,
        scan_count=totals_scans,
        found_total=totals_found,
        found_in_place=totals_in_place,
        found_wrong_location=totals_wrong_location,
        missing=totals_missing,
        found_rate=_safe_rate(totals_found, totals_expected),
        in_place_rate=_safe_rate(totals_in_place, totals_expected),
        unexpected=totals_unexpected,
        duplicate=totals_duplicate,
        unknown_barcode=totals_unknown_barcode,
        discrepancies=AuditReportDiscrepancyTotals(
            total=totals_discrepancies_total,
            open=totals_discrepancies_open,
            resolved=totals_discrepancies_resolved,
            ignored=totals_discrepancies_ignored,
        ),
        sessions=session_rows,
    )
