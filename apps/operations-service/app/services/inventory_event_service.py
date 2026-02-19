from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import InventoryEvent
from app.schemas import InventoryEventCreate


def list_inventory_events(
    db: Session,
    *,
    item_id: int | None = None,
    actor_user_id: int | None = None,
    event_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[InventoryEvent]:
    stmt: Select[tuple[InventoryEvent]] = select(InventoryEvent).order_by(InventoryEvent.id.desc())
    if item_id is not None:
        stmt = stmt.where(InventoryEvent.item_id == item_id)
    if actor_user_id is not None:
        stmt = stmt.where(InventoryEvent.actor_user_id == actor_user_id)
    if event_type is not None:
        stmt = stmt.where(InventoryEvent.event_type == event_type)

    stmt = stmt.limit(max(1, min(limit, 500))).offset(max(0, offset))
    return db.execute(stmt).scalars().all()


def get_inventory_event(event_id: int, db: Session) -> InventoryEvent:
    event = db.get(InventoryEvent, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="event_not_found")
    return event


def create_inventory_event(
    payload: InventoryEventCreate,
    *,
    actor_user_id: int | None,
    db: Session,
) -> InventoryEvent:
    event = InventoryEvent(
        item_id=payload.item_id,
        event_type=payload.event_type,
        actor_user_id=actor_user_id,
        from_location_id=payload.from_location_id,
        to_location_id=payload.to_location_id,
        from_responsible_id=payload.from_responsible_id,
        to_responsible_id=payload.to_responsible_id,
        metadata_=payload.metadata,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
