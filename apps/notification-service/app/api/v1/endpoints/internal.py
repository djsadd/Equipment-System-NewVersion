from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_internal_token
from app.schemas import InternalNotificationCreate
import app.services.notification_service as notification_service

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/notifications")
def create_notifications(
    payload: InternalNotificationCreate,
    _internal: None = Depends(require_internal_token),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    created = notification_service.create_internal_notifications(
        db,
        user_ids=payload.user_ids,
        type=payload.type,
        title=payload.title,
        message=payload.message,
        payload=payload.payload,
        source_service=payload.source_service,
        source_event=payload.source_event,
        idempotency_key=payload.idempotency_key,
    )
    return {"created": created}
