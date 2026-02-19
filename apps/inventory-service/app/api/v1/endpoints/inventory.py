from __future__ import annotations

import uuid
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import (
    get_current_user,
    get_db,
    require_inventory_auditor,
    require_system_admin,
    security,
)
from app.schemas import (
    InventoryBulkMoveRequest,
    InventoryBulkMoveResult,
    InventoryItemAddBarcodeRequest,
    InventoryItemCreate,
    InventoryItemPublic,
    InventoryItemScanRequest,
    InventoryItemUpdate,
)
from app.services import inventory_service

router = APIRouter(prefix="/items", tags=["inventory"])
optional_security = HTTPBearer(auto_error=False)


@router.get("", response_model=list[InventoryItemPublic])
def list_items(db: Session = Depends(get_db)) -> list[InventoryItemPublic]:
    return inventory_service.list_items(db)


@router.get("/my", response_model=list[InventoryItemPublic])
def list_my_items(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InventoryItemPublic]:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return inventory_service.list_items_for_user(user_id, db)


@router.get("/room/{room_id}", response_model=list[InventoryItemPublic])
async def list_items_by_room(
    room_id: int,
    _current_user: dict[str, Any] = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> list[InventoryItemPublic]:
    token = credentials.credentials
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.location_service_url}/rooms/my/{room_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="room_forbidden")
    return inventory_service.list_items_for_location(room_id, db)


@router.get("/{item_id}", response_model=InventoryItemPublic)
def get_item(item_id: int, db: Session = Depends(get_db)) -> InventoryItemPublic:
    return inventory_service.get_item(item_id, db)


@router.post("/scan", response_model=InventoryItemPublic)
def scan_my_item(
    payload: InventoryItemScanRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InventoryItemPublic:
    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return inventory_service.get_my_item_by_scanned_barcode_value(
        user_id=user_id, barcode_value=payload.barcode_value, db=db
    )


@router.post("/resolve", response_model=InventoryItemPublic)
def resolve_item_by_barcode(
    payload: InventoryItemScanRequest,
    _current_user: dict[str, Any] = Depends(require_inventory_auditor),
    db: Session = Depends(get_db),
) -> InventoryItemPublic:
    return inventory_service.get_item_by_scanned_barcode_value(
        barcode_value=payload.barcode_value, db=db
    )


@router.post("", response_model=InventoryItemPublic, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: InventoryItemCreate, db: Session = Depends(get_db)
) -> InventoryItemPublic:
    return inventory_service.create_item(payload, db)


@router.post(
    "/{item_id}/barcodes",
    response_model=InventoryItemPublic,
    status_code=status.HTTP_201_CREATED,
)
def add_generated_barcode(
    item_id: int,
    payload: InventoryItemAddBarcodeRequest,
    db: Session = Depends(get_db),
) -> InventoryItemPublic:
    return inventory_service.add_generated_barcode(item_id, db, title=payload.title)


@router.put("/{item_id}", response_model=InventoryItemPublic)
def update_item(
    item_id: int,
    payload: InventoryItemUpdate,
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
    db: Session = Depends(get_db),
) -> InventoryItemPublic:
    previous = inventory_service.get_item(item_id, db)
    previous_location_id = previous.location_id
    previous_responsible_id = previous.responsible_id

    updated = inventory_service.update_item(item_id, payload, db)

    patch = payload.model_dump(exclude_unset=True)
    touched_move_fields = "location_id" in patch or "responsible_id" in patch
    is_moved = (
        touched_move_fields
        and (
            previous_location_id != updated.location_id
            or previous_responsible_id != updated.responsible_id
        )
    )

    if is_moved and credentials is not None:
        token = credentials.credentials
        try:
            with httpx.Client(timeout=5) as client:
                response = client.post(
                    f"{settings.operations_service_url}/inventory/events",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "item_id": updated.id,
                        "event_type": "MOVE",
                        "from_location_id": previous_location_id,
                        "to_location_id": updated.location_id,
                        "from_responsible_id": previous_responsible_id,
                        "to_responsible_id": updated.responsible_id,
                        "metadata": {"source": "inventory_service.update_item"},
                    },
                )
            if response.status_code != status.HTTP_201_CREATED:
                # don't block inventory update if operations service is unavailable
                pass
        except Exception:
            # don't block inventory update if operations service is unavailable
            pass

    return updated


@router.post("/bulk-move", response_model=InventoryBulkMoveResult)
def bulk_move_items(
    payload: InventoryBulkMoveRequest,
    _current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> InventoryBulkMoveResult:
    token = credentials.credentials

    # validate location exists (and current user is allowed to use it)
    try:
        with httpx.Client(timeout=5) as client:
            response = client.get(
                f"{settings.location_service_url}/rooms/{payload.location_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
        if response.status_code == status.HTTP_404_NOT_FOUND:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="location_not_found"
            )
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="location_forbidden"
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="location_service_unavailable",
        )

    patch = payload.model_dump(exclude_unset=True)
    responsible_id_is_set = "responsible_id" in patch
    responsible_id = patch.get("responsible_id") if responsible_id_is_set else None

    items, missing_ids, previous_by_id = inventory_service.bulk_move_items(
        payload.item_ids,
        location_id=payload.location_id,
        responsible_id_is_set=responsible_id_is_set,
        responsible_id=responsible_id,
        db=db,
    )

    batch_id = str(uuid.uuid4())
    for item in items:
        previous_location_id, previous_responsible_id = previous_by_id.get(
            item.id, (None, None)
        )
        is_moved = (
            previous_location_id != item.location_id
            or previous_responsible_id != item.responsible_id
        )
        if not is_moved:
            continue

        try:
            with httpx.Client(timeout=5) as client:
                response = client.post(
                    f"{settings.operations_service_url}/inventory/events",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "item_id": item.id,
                        "event_type": "MOVE",
                        "from_location_id": previous_location_id,
                        "to_location_id": item.location_id,
                        "from_responsible_id": previous_responsible_id,
                        "to_responsible_id": item.responsible_id,
                        "metadata": {
                            "source": "inventory_service.bulk_move_items",
                            "batch_id": batch_id,
                        },
                    },
                )
            if response.status_code != status.HTTP_201_CREATED:
                pass
        except Exception:
            pass

    return InventoryBulkMoveResult(
        moved_count=len(items),
        moved_item_ids=[item.id for item in items],
        not_found_item_ids=missing_ids,
    )


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)) -> dict:
    return inventory_service.delete_item(item_id, db)
