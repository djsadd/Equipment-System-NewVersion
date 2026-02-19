from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Notification, NotificationPreference


def list_notifications_for_user(
    db: Session,
    *,
    user_id: int,
    unread_only: bool = False,
    type_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Notification]:
    stmt: Select[tuple[Notification]] = (
        select(Notification)
        .where(Notification.user_id == user_id, Notification.archived_at.is_(None))
        .order_by(Notification.id.desc())
    )
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    if type_filter:
        stmt = stmt.where(Notification.type == type_filter)
    stmt = stmt.limit(max(1, min(limit, 200))).offset(max(0, offset))
    return db.execute(stmt).scalars().all()


def unread_count(db: Session, *, user_id: int) -> int:
    return int(
        db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.archived_at.is_(None),
                Notification.read_at.is_(None),
            )
        ).scalar_one()
    )


def mark_read(db: Session, *, user_id: int, ids: list[int]) -> int:
    if not ids:
        return 0
    now = datetime.now(timezone.utc)
    result = db.execute(
        update(Notification)
        .where(
            and_(
                Notification.user_id == user_id,
                Notification.id.in_(ids),
                Notification.archived_at.is_(None),
            )
        )
        .values(read_at=now)
    )
    db.commit()
    return int(getattr(result, "rowcount", 0) or 0)


def mark_all_read(db: Session, *, user_id: int) -> int:
    now = datetime.now(timezone.utc)
    result = db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.archived_at.is_(None),
            Notification.read_at.is_(None),
        )
        .values(read_at=now)
    )
    db.commit()
    return int(getattr(result, "rowcount", 0) or 0)


def create_internal_notifications(
    db: Session,
    *,
    user_ids: list[int],
    type: str,
    title: str,
    message: str,
    payload: dict[str, Any] | None,
    source_service: str | None,
    source_event: str | None,
    idempotency_key: str | None,
) -> int:
    if not user_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="user_ids_required")

    created = 0
    for user_id in user_ids:
        try:
            with db.begin_nested():
                row = Notification(
                    user_id=user_id,
                    type=type,
                    title=title,
                    message=message,
                    payload=payload,
                    source_service=source_service,
                    source_event=source_event,
                    idempotency_key=idempotency_key,
                )
                db.add(row)
                db.flush()
            created += 1
        except IntegrityError:
            continue

    db.commit()
    return created


def get_preferences(db: Session, *, user_id: int) -> NotificationPreference:
    pref = db.get(NotificationPreference, user_id)
    if pref:
        return pref
    pref = NotificationPreference(user_id=user_id, channels=None)
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def upsert_preferences(db: Session, *, user_id: int, channels: dict[str, Any] | None) -> NotificationPreference:
    pref = db.get(NotificationPreference, user_id)
    if not pref:
        pref = NotificationPreference(user_id=user_id, channels=channels)
        db.add(pref)
        db.commit()
        db.refresh(pref)
        return pref
    pref.channels = channels
    db.commit()
    db.refresh(pref)
    return pref
