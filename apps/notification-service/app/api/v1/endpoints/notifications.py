from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.schemas import (
    NotificationListItem,
    NotificationMarkRead,
    PreferencesPublic,
    PreferencesUpdate,
)
import app.services.notification_service as notification_service

router = APIRouter(tags=["notifications"])


@router.get("/", response_model=list[NotificationListItem])
def list_notifications(
    unread_only: bool = Query(default=False),
    type_filter: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NotificationListItem]:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        return []
    return notification_service.list_notifications_for_user(
        db,
        user_id=user_id,
        unread_only=unread_only,
        type_filter=type_filter,
        limit=limit,
        offset=offset,
    )


@router.get("/unread-count")
def get_unread_count(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        return {"count": 0}
    return {"count": notification_service.unread_count(db, user_id=user_id)}


@router.post("/mark-read")
def mark_read(
    payload: NotificationMarkRead,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        return {"updated": 0}
    updated = notification_service.mark_read(db, user_id=user_id, ids=payload.ids)
    return {"updated": updated}


@router.post("/mark-all-read")
def mark_all_read(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        return {"updated": 0}
    updated = notification_service.mark_all_read(db, user_id=user_id)
    return {"updated": updated}


@router.get("/preferences", response_model=PreferencesPublic)
def get_preferences(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PreferencesPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        return PreferencesPublic(user_id=0, channels=None)
    pref = notification_service.get_preferences(db, user_id=user_id)
    return PreferencesPublic(user_id=pref.user_id, channels=pref.channels)


@router.put("/preferences", response_model=PreferencesPublic)
def update_preferences(
    payload: PreferencesUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PreferencesPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        return PreferencesPublic(user_id=0, channels=None)
    pref = notification_service.upsert_preferences(db, user_id=user_id, channels=payload.channels)
    return PreferencesPublic(user_id=pref.user_id, channels=pref.channels)
