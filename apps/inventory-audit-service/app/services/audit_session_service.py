from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.clients import (
    bulk_move_items,
    create_internal_notifications,
    list_items_by_room,
    resolve_item_by_barcode,
)
from app.core.config import settings
from app.models import (
    AuditAction,
    AuditDiscrepancy,
    AuditExpectedItem,
    AuditItemResult,
    AuditScan,
    AuditSession,
)
from app.models.enums import (
    AuditActionStatus,
    AuditActionType,
    AuditItemResultStatus,
    AuditSessionStatus,
    DiscrepancyType,
    ResolutionStatus,
)
from app.schemas import AuditScanCreate, AuditSessionCreate


def _best_effort_notify(
    *,
    user_ids: list[int],
    type: str,
    title: str,
    message: str,
    payload: dict[str, Any] | None = None,
    source_event: str | None = None,
    idempotency_key: str | None = None,
) -> None:
    user_ids = [uid for uid in user_ids if isinstance(uid, int)]
    if not user_ids:
        return
    try:
        create_internal_notifications(
            notification_service_url=settings.notification_service_url,
            internal_token=settings.notification_internal_token,
            user_ids=sorted(set(user_ids)),
            type=type,
            title=title,
            message=message,
            payload=payload,
            source_service="audit",
            source_event=source_event,
            idempotency_key=idempotency_key,
        )
    except Exception:
        return


def _normalize_barcode_value(value: str) -> str:
    return "".join(str(value).split()).strip()


def _barcode_payload11(normalized_digits: str) -> str | None:
    if not normalized_digits.isdigit():
        return None
    if len(normalized_digits) == 13:
        return normalized_digits[1:12]
    if len(normalized_digits) == 12:
        return normalized_digits[:11]
    if len(normalized_digits) == 11:
        return normalized_digits
    return None


def _barcode_matches(*, scanned: str, stored: str) -> bool:
    if stored == scanned:
        return True
    payload11 = _barcode_payload11(scanned)
    if not payload11:
        return False
    if not stored.isdigit() or len(stored) != 13:
        return False
    return stored[1:12] == payload11


def _resolve_item_id_from_inventory(
    *, token: str, barcode_value: str
) -> int | None:
    normalized = _normalize_barcode_value(barcode_value)
    if not normalized:
        return None

    resolved = resolve_item_by_barcode(
        token=token, inventory_service_url=settings.inventory_service_url, barcode_value=normalized
    )
    if not resolved:
        return None
    item_id = resolved.get("id")
    return item_id if isinstance(item_id, int) else None


def list_sessions(
    db: Session,
    *,
    location_id: int | None = None,
    plan_id: int | None = None,
    status: AuditSessionStatus | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditSession]:
    stmt: Select[tuple[AuditSession]] = select(AuditSession).order_by(AuditSession.id.desc())
    if location_id is not None:
        stmt = stmt.where(AuditSession.location_id == location_id)
    if plan_id is not None:
        stmt = stmt.where(AuditSession.plan_id == plan_id)
    if status is not None:
        stmt = stmt.where(AuditSession.status == status)
    stmt = stmt.limit(max(1, min(limit, 500))).offset(max(0, offset))
    return db.execute(stmt).scalars().all()


def get_session(session_id: int, db: Session) -> AuditSession:
    session = db.get(AuditSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session_not_found")
    return session


def create_session(payload: AuditSessionCreate, db: Session) -> AuditSession:
    session = AuditSession(plan_id=payload.plan_id, location_id=payload.location_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def start_session(
    session_id: int,
    *,
    token: str,
    started_by: int,
    db: Session,
) -> AuditSession:
    session = get_session(session_id, db)
    if session.status != AuditSessionStatus.draft:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_not_draft")

    items = list_items_by_room(
        token=token, inventory_service_url=settings.inventory_service_url, room_id=session.location_id
    )

    db.execute(delete(AuditExpectedItem).where(AuditExpectedItem.session_id == session.id))
    db.execute(delete(AuditItemResult).where(AuditItemResult.session_id == session.id))
    db.flush()

    for raw in items:
        if not isinstance(raw, dict):
            continue
        item_id = raw.get("id")
        if not isinstance(item_id, int):
            continue
        expected = AuditExpectedItem(
            session_id=session.id,
            item_id=item_id,
            expected_location_id=raw.get("location_id") if isinstance(raw.get("location_id"), int) else None,
            expected_responsible_id=raw.get("responsible_id")
            if isinstance(raw.get("responsible_id"), int)
            else None,
            barcode_id=raw.get("barcode_id") if isinstance(raw.get("barcode_id"), int) else None,
        )
        db.add(expected)
        db.add(
            AuditItemResult(
                session_id=session.id,
                item_id=item_id,
                status=AuditItemResultStatus.missing,
                expected_location_id=expected.expected_location_id,
                found_location_id=None,
                first_found_at=None,
                last_scan_at=None,
            )
        )

    session.status = AuditSessionStatus.in_progress
    session.started_by = started_by
    session.started_at = datetime.now(timezone.utc)
    session.expected_snapshot_version = str(uuid.uuid4())
    db.commit()
    db.refresh(session)

    _best_effort_notify(
        user_ids=[started_by],
        type="task",
        title="Инвентаризация начата",
        message=f"Сессия #{session.id} переведена в работу.",
        payload={
            "session_id": session.id,
            "location_id": session.location_id,
            "status": getattr(session.status, "value", str(session.status)),
        },
        source_event="audit_session_started",
        idempotency_key=f"audit:session:{session.id}:started",
    )
    return session


def create_scan(
    session_id: int,
    payload: AuditScanCreate,
    *,
    scanner_user_id: int,
    token: str | None = None,
    db: Session,
) -> AuditScan:
    session = get_session(session_id, db)
    if session.status != AuditSessionStatus.in_progress:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_not_in_progress")

    if payload.found_location_id != session.location_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="found_location_must_match_session_location",
        )

    if payload.item_id is None and payload.barcode_value is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="item_or_barcode_required")

    resolved_item_id: int | None = payload.item_id
    normalized_barcode_value: str | None = (
        _normalize_barcode_value(payload.barcode_value) if payload.barcode_value is not None else None
    )
    if resolved_item_id is None and normalized_barcode_value and token:
        resolved_item_id = _resolve_item_id_from_inventory(
            token=token,
            barcode_value=normalized_barcode_value,
        )

    scan = AuditScan(
        session_id=session.id,
        scanner_user_id=scanner_user_id,
        barcode_value=normalized_barcode_value,
        item_id=resolved_item_id,
        found_location_id=payload.found_location_id,
        notes=payload.notes,
        photo_url=payload.photo_url,
        client_scan_id=payload.client_scan_id,
        extra=payload.extra,
    )
    db.add(scan)
    now = datetime.now(timezone.utc)
    try:
        db.flush()
        _update_item_result_from_scan(session, scan, now=now, db=db)
        _update_discrepancies_from_scan(session, scan, db=db)
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.execute(
            select(AuditScan).where(
                AuditScan.session_id == session.id, AuditScan.client_scan_id == payload.client_scan_id
            )
        ).scalar_one_or_none()
        if not existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="scan_already_exists")
        _update_item_result_from_scan(session, existing, now=now, db=db)
        _update_discrepancies_from_scan(session, existing, db=db)
        db.commit()
        return existing
    db.refresh(scan)
    return scan


def _update_item_result_from_scan(session: AuditSession, scan: AuditScan, *, now: datetime, db: Session) -> None:
    if not isinstance(scan.item_id, int):
        return

    result = db.execute(
        select(AuditItemResult).where(
            AuditItemResult.session_id == session.id, AuditItemResult.item_id == scan.item_id
        )
    ).scalar_one_or_none()
    if not result:
        result = AuditItemResult(
            session_id=session.id,
            item_id=scan.item_id,
            status=AuditItemResultStatus.found,
            expected_location_id=None,
            found_location_id=scan.found_location_id,
            first_found_at=now,
            last_scan_at=now,
        )
        db.add(result)
        return

    if result.first_found_at is None:
        result.first_found_at = now
    result.last_scan_at = now
    result.found_location_id = scan.found_location_id

    if result.expected_location_id is not None and scan.found_location_id == result.expected_location_id:
        result.status = AuditItemResultStatus.found_in_place
    else:
        result.status = AuditItemResultStatus.found


def _upsert_discrepancy(
    *,
    session_id: int,
    dtype: DiscrepancyType,
    item_id: int | None,
    barcode_value: str | None,
    expected_location_id: int | None,
    found_location_id: int | None,
    db: Session,
) -> None:
    stmt = select(AuditDiscrepancy).where(
        AuditDiscrepancy.session_id == session_id,
        AuditDiscrepancy.type == dtype,
        AuditDiscrepancy.resolution_status == ResolutionStatus.open,
    )
    if item_id is not None:
        stmt = stmt.where(AuditDiscrepancy.item_id == item_id)
    else:
        stmt = stmt.where(AuditDiscrepancy.item_id.is_(None))
    if barcode_value is not None:
        stmt = stmt.where(AuditDiscrepancy.barcode_value == barcode_value)
    else:
        stmt = stmt.where(AuditDiscrepancy.barcode_value.is_(None))

    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        existing.expected_location_id = expected_location_id
        existing.found_location_id = found_location_id
        return

    db.add(
        AuditDiscrepancy(
            session_id=session_id,
            type=dtype,
            item_id=item_id,
            barcode_value=barcode_value,
            expected_location_id=expected_location_id,
            found_location_id=found_location_id,
            resolution_status=ResolutionStatus.open,
        )
    )


def _update_discrepancies_from_scan(session: AuditSession, scan: AuditScan, *, db: Session) -> None:
    if scan.item_id is None:
        if scan.barcode_value:
            _upsert_discrepancy(
                session_id=session.id,
                dtype=DiscrepancyType.unknown_barcode,
                item_id=None,
                barcode_value=scan.barcode_value,
                expected_location_id=None,
                found_location_id=scan.found_location_id,
                db=db,
            )
        return

    expected = db.execute(
        select(AuditExpectedItem).where(
            AuditExpectedItem.session_id == session.id, AuditExpectedItem.item_id == scan.item_id
        )
    ).scalar_one_or_none()

    if expected is None:
        _upsert_discrepancy(
            session_id=session.id,
            dtype=DiscrepancyType.unexpected,
            item_id=scan.item_id,
            barcode_value=None,
            expected_location_id=None,
            found_location_id=scan.found_location_id,
            db=db,
        )
        return

    if (
        expected.expected_location_id is not None
        and scan.found_location_id != expected.expected_location_id
    ):
        _upsert_discrepancy(
            session_id=session.id,
            dtype=DiscrepancyType.misplaced,
            item_id=scan.item_id,
            barcode_value=None,
            expected_location_id=expected.expected_location_id,
            found_location_id=scan.found_location_id,
            db=db,
        )


def list_item_results(session_id: int, db: Session) -> list[AuditItemResult]:
    session = get_session(session_id, db)
    _ = session
    return db.execute(
        select(AuditItemResult)
        .where(AuditItemResult.session_id == session_id)
        .order_by(AuditItemResult.item_id.asc())
    ).scalars().all()


def _rebuild_discrepancies(session: AuditSession, db: Session) -> None:
    expected = db.execute(
        select(AuditExpectedItem).where(AuditExpectedItem.session_id == session.id)
    ).scalars().all()
    scans = db.execute(select(AuditScan).where(AuditScan.session_id == session.id)).scalars().all()

    expected_by_item_id: dict[int, AuditExpectedItem] = {e.item_id: e for e in expected}
    expected_item_ids = set(expected_by_item_id.keys())

    scanned_item_ids = [s.item_id for s in scans if isinstance(s.item_id, int)]
    scanned_item_id_set = set(scanned_item_ids)

    db.execute(delete(AuditDiscrepancy).where(AuditDiscrepancy.session_id == session.id))
    db.flush()

    # missing: expected, but never scanned
    for item_id in sorted(expected_item_ids - scanned_item_id_set):
        e = expected_by_item_id[item_id]
        db.add(
            AuditDiscrepancy(
                session_id=session.id,
                type=DiscrepancyType.missing,
                item_id=item_id,
                expected_location_id=e.expected_location_id,
                found_location_id=None,
                resolution_status=ResolutionStatus.open,
            )
        )

    # duplicates: item scanned multiple times
    counts = Counter(scanned_item_ids)
    for item_id, count in counts.items():
        if count <= 1:
            continue
        e = expected_by_item_id.get(item_id)
        db.add(
            AuditDiscrepancy(
                session_id=session.id,
                type=DiscrepancyType.duplicate,
                item_id=item_id,
                expected_location_id=e.expected_location_id if e else None,
                found_location_id=session.location_id,
                resolution_status=ResolutionStatus.open,
                resolution_payload={"count": count},
            )
        )

    # unexpected: scanned but not expected
    for item_id in sorted(scanned_item_id_set - expected_item_ids):
        db.add(
            AuditDiscrepancy(
                session_id=session.id,
                type=DiscrepancyType.unexpected,
                item_id=item_id,
                expected_location_id=None,
                found_location_id=session.location_id,
                resolution_status=ResolutionStatus.open,
            )
        )

    # misplaced: expected but scanned in other location
    for scan in scans:
        if not isinstance(scan.item_id, int):
            continue
        e = expected_by_item_id.get(scan.item_id)
        if not e:
            continue
        if e.expected_location_id is None:
            continue
        if scan.found_location_id != e.expected_location_id:
            db.add(
                AuditDiscrepancy(
                    session_id=session.id,
                    type=DiscrepancyType.misplaced,
                    item_id=scan.item_id,
                    expected_location_id=e.expected_location_id,
                    found_location_id=scan.found_location_id,
                    resolution_status=ResolutionStatus.open,
                )
            )

    # unknown barcode
    for scan in scans:
        if scan.item_id is not None:
            continue
        if not scan.barcode_value:
            continue
        db.add(
            AuditDiscrepancy(
                session_id=session.id,
                type=DiscrepancyType.unknown_barcode,
                item_id=None,
                barcode_value=scan.barcode_value,
                expected_location_id=None,
                found_location_id=scan.found_location_id,
                resolution_status=ResolutionStatus.open,
            )
        )


def close_session(session_id: int, *, closed_by: int, db: Session) -> AuditSession:
    session = get_session(session_id, db)
    if session.status != AuditSessionStatus.in_progress:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_not_in_progress")

    session.status = AuditSessionStatus.reconciling
    session.closed_by = closed_by
    session.closed_at = datetime.now(timezone.utc)
    db.commit()

    _rebuild_discrepancies(session, db)
    session.status = AuditSessionStatus.awaiting_approval
    db.commit()
    db.refresh(session)

    _best_effort_notify(
        user_ids=[session.started_by, closed_by],
        type="task",
        title="Инвентаризация закрыта",
        message=f"Сессия #{session.id} закрыта и ожидает утверждения.",
        payload={
            "session_id": session.id,
            "location_id": session.location_id,
            "status": getattr(session.status, "value", str(session.status)),
        },
        source_event="audit_session_closed",
        idempotency_key=f"audit:session:{session.id}:closed",
    )
    return session


def resolve_discrepancy(
    discrepancy_id: int,
    *,
    resolution_status: ResolutionStatus,
    resolution_payload: dict[str, Any] | None,
    db: Session,
) -> AuditDiscrepancy:
    discrepancy = db.get(AuditDiscrepancy, discrepancy_id)
    if not discrepancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="discrepancy_not_found"
        )
    discrepancy.resolution_status = resolution_status
    discrepancy.resolution_payload = resolution_payload
    db.commit()
    db.refresh(discrepancy)
    return discrepancy


def approve_session(session_id: int, *, approved_by: int, db: Session) -> AuditSession:
    session = get_session(session_id, db)
    if session.status != AuditSessionStatus.awaiting_approval:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_not_awaiting_approval")

    open_count = db.execute(
        select(AuditDiscrepancy).where(
            AuditDiscrepancy.session_id == session.id,
            AuditDiscrepancy.resolution_status == ResolutionStatus.open,
        )
    ).scalars().first()
    if open_count is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="discrepancies_not_resolved")

    session.status = AuditSessionStatus.approved
    session.approved_by = approved_by
    session.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    _best_effort_notify(
        user_ids=[session.started_by, session.closed_by, approved_by],
        type="info",
        title="Инвентаризация утверждена",
        message=f"Сессия #{session.id} утверждена.",
        payload={
            "session_id": session.id,
            "location_id": session.location_id,
            "status": getattr(session.status, "value", str(session.status)),
        },
        source_event="audit_session_approved",
        idempotency_key=f"audit:session:{session.id}:approved",
    )
    return session


def build_actions_from_resolutions(session_id: int, db: Session) -> list[AuditAction]:
    session = get_session(session_id, db)
    if session.status != AuditSessionStatus.approved:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_not_approved")

    discrepancies = db.execute(
        select(AuditDiscrepancy).where(
            AuditDiscrepancy.session_id == session.id,
            AuditDiscrepancy.resolution_status == ResolutionStatus.resolved,
        )
    ).scalars().all()

    created: list[AuditAction] = []
    for d in discrepancies:
        payload = d.resolution_payload or {}
        if not isinstance(payload, dict):
            continue
        action = payload.get("action")
        if action == "move" and isinstance(d.item_id, int):
            to_location_id = payload.get("to_location_id")
            if not isinstance(to_location_id, int):
                continue

            responsible_id_is_set = "responsible_id" in payload
            responsible_id = payload.get("responsible_id") if responsible_id_is_set else None
            if responsible_id_is_set and responsible_id is not None and not isinstance(responsible_id, int):
                continue

            idempotency_key = f"session:{session.id}:discrepancy:{d.id}:move:{to_location_id}:{responsible_id_is_set}:{responsible_id}"
            action_row = AuditAction(
                session_id=session.id,
                action_type=AuditActionType.move,
                payload={
                    "item_id": d.item_id,
                    "to_location_id": to_location_id,
                    "responsible_id_is_set": responsible_id_is_set,
                    "responsible_id": responsible_id,
                },
                status=AuditActionStatus.pending,
                idempotency_key=idempotency_key,
            )
            db.add(action_row)
            created.append(action_row)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    for a in created:
        db.refresh(a)
    return created


def apply_session(session_id: int, *, token: str, db: Session) -> AuditSession:
    session = get_session(session_id, db)
    if session.status != AuditSessionStatus.approved:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_not_approved")

    actions = db.execute(
        select(AuditAction).where(
            AuditAction.session_id == session.id, AuditAction.status == AuditActionStatus.pending
        )
    ).scalars().all()

    move_groups: dict[tuple[int, bool, int | None], list[int]] = defaultdict(list)
    for a in actions:
        if a.action_type != AuditActionType.move:
            continue
        payload = a.payload
        item_id = payload.get("item_id") if isinstance(payload, dict) else None
        to_location_id = payload.get("to_location_id") if isinstance(payload, dict) else None
        responsible_id_is_set = payload.get("responsible_id_is_set") if isinstance(payload, dict) else False
        responsible_id = payload.get("responsible_id") if isinstance(payload, dict) else None

        if not isinstance(item_id, int) or not isinstance(to_location_id, int):
            continue
        if not isinstance(responsible_id_is_set, bool):
            responsible_id_is_set = False
        if responsible_id_is_set and responsible_id is not None and not isinstance(responsible_id, int):
            continue

        move_groups[(to_location_id, responsible_id_is_set, responsible_id)].append(item_id)

    any_failed = False
    for (to_location_id, responsible_id_is_set, responsible_id), item_ids in move_groups.items():
        try:
            bulk_move_items(
                token=token,
                inventory_service_url=settings.inventory_service_url,
                item_ids=item_ids,
                location_id=to_location_id,
                responsible_id_is_set=responsible_id_is_set,
                responsible_id=responsible_id,
            )
        except HTTPException as exc:
            any_failed = True
            for a in actions:
                if a.action_type != AuditActionType.move:
                    continue
                p = a.payload or {}
                if not isinstance(p, dict):
                    continue
                if (
                    p.get("to_location_id") == to_location_id
                    and bool(p.get("responsible_id_is_set")) == responsible_id_is_set
                    and p.get("responsible_id") == responsible_id
                ):
                    a.status = AuditActionStatus.failed
                    a.last_error = str(exc.detail)
            db.commit()
            continue

        for a in actions:
            if a.action_type != AuditActionType.move:
                continue
            p = a.payload or {}
            if not isinstance(p, dict):
                continue
            if (
                p.get("to_location_id") == to_location_id
                and bool(p.get("responsible_id_is_set")) == responsible_id_is_set
                and p.get("responsible_id") == responsible_id
            ):
                a.status = AuditActionStatus.done
                a.last_error = None
        db.commit()

    if any_failed:
        db.refresh(session)
        return session

    session.status = AuditSessionStatus.applied
    session.applied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    _best_effort_notify(
        user_ids=[session.started_by, session.closed_by, session.approved_by],
        type="info",
        title="Результаты инвентаризации применены",
        message=f"Сессия #{session.id}: изменения применены.",
        payload={
            "session_id": session.id,
            "location_id": session.location_id,
            "status": getattr(session.status, "value", str(session.status)),
        },
        source_event="audit_session_applied",
        idempotency_key=f"audit:session:{session.id}:applied",
    )
    return session


def list_expected_items(session_id: int, db: Session) -> list[AuditExpectedItem]:
    _ = get_session(session_id, db)
    return db.execute(
        select(AuditExpectedItem).where(AuditExpectedItem.session_id == session_id).order_by(AuditExpectedItem.id)
    ).scalars().all()


def list_discrepancies(session_id: int, db: Session) -> list[AuditDiscrepancy]:
    _ = get_session(session_id, db)
    return db.execute(
        select(AuditDiscrepancy).where(AuditDiscrepancy.session_id == session_id).order_by(AuditDiscrepancy.id)
    ).scalars().all()


def list_actions(session_id: int, db: Session) -> list[AuditAction]:
    _ = get_session(session_id, db)
    return db.execute(
        select(AuditAction).where(AuditAction.session_id == session_id).order_by(AuditAction.id)
    ).scalars().all()
