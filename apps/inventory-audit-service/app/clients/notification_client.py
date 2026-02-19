from __future__ import annotations

from typing import Any

import httpx


def create_internal_notifications(
    *,
    notification_service_url: str,
    internal_token: str,
    user_ids: list[int],
    type: str,
    title: str,
    message: str,
    payload: dict[str, Any] | None = None,
    source_service: str | None = None,
    source_event: str | None = None,
    idempotency_key: str | None = None,
) -> bool:
    token = (internal_token or "").strip()
    if not token:
        return False

    try:
        with httpx.Client(timeout=5) as client:
            response = client.post(
                f"{notification_service_url}/internal/notifications",
                headers={"X-Internal-Token": token},
                json={
                    "user_ids": user_ids,
                    "type": type,
                    "title": title,
                    "message": message,
                    "payload": payload,
                    "source_service": source_service,
                    "source_event": source_event,
                    "idempotency_key": idempotency_key,
                },
            )
    except Exception:
        return False

    return 200 <= response.status_code < 300

