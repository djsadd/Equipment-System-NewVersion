from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_system_admin
from app.schemas import InventoryEventCreate, InventoryEventPublic
from app.services import create_inventory_event, get_inventory_event, list_inventory_events

router = APIRouter(prefix="/inventory/events", tags=["inventory-events"])


@router.get("", response_model=list[InventoryEventPublic], dependencies=[Depends(require_system_admin)])
def list_events(
    item_id: int | None = Query(default=None),
    actor_user_id: int | None = Query(default=None),
    event_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[InventoryEventPublic]:
    return list_inventory_events(
        db,
        item_id=item_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )


@router.get("/{event_id}", response_model=InventoryEventPublic, dependencies=[Depends(require_system_admin)])
def get_event(event_id: int, db: Session = Depends(get_db)) -> InventoryEventPublic:
    return get_inventory_event(event_id, db)


@router.post("", response_model=InventoryEventPublic, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: InventoryEventCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InventoryEventPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    actor_user_id = user_id if isinstance(user_id, int) else None
    return create_inventory_event(payload, actor_user_id=actor_user_id, db=db)

