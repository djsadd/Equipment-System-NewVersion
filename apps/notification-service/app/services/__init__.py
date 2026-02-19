from __future__ import annotations

from app.services.notification_service import (
    create_internal_notifications,
    get_preferences,
    list_notifications_for_user,
    mark_all_read,
    mark_read,
    unread_count,
    upsert_preferences,
)

__all__ = [
    "create_internal_notifications",
    "get_preferences",
    "list_notifications_for_user",
    "mark_all_read",
    "mark_read",
    "unread_count",
    "upsert_preferences",
]

