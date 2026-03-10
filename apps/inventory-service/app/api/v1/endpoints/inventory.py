from __future__ import annotations

import uuid
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import StreamingResponse
from sqlalchemy import select
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
    InventoryCategoryCreate,
    InventoryCategoryPublic,
    InventoryItemAddBarcodeRequest,
    InventoryItemCreate,
    InventoryItemPagePublic,
    InventoryItemPublic,
    InventoryItemScanRequest,
    InventoryItemUpdate,
    InventoryImportConfirmResponse,
    InventoryImportPreviewResponse,
)
from app.services import inventory_import_service, inventory_service
from app.models.inventory_item import InventoryItem
from app.models.inventory_status import InventoryStatus

router = APIRouter(prefix="/items", tags=["inventory"])
optional_security = HTTPBearer(auto_error=False)


@router.get("", response_model=list[InventoryItemPublic])
def list_items(db: Session = Depends(get_db)) -> list[InventoryItemPublic]:
    return inventory_service.list_items(db)


@router.get("/search", response_model=InventoryItemPagePublic)
def search_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    q: str | None = Query(None, max_length=200),
    status_value: InventoryStatus | None = Query(None, alias="status"),
    category: str | None = Query(None, max_length=100),
    inventory_type_id: int | None = Query(None, ge=1),
    location_id: int | None = Query(None, ge=1),
    responsible_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db),
) -> InventoryItemPagePublic:
    items, total = inventory_service.search_items(
        db=db,
        page=page,
        page_size=page_size,
        q=q,
        status_value=status_value,
        category=category,
        inventory_type_id=inventory_type_id,
        location_id=location_id,
        responsible_id=responsible_id,
    )
    return InventoryItemPagePublic(items=items, total=total, page=page, page_size=page_size)


@router.get("/categories", response_model=list[str])
def list_item_categories(db: Session = Depends(get_db)) -> list[str]:
    return inventory_service.list_item_categories(db)


@router.post("/categories", response_model=InventoryCategoryPublic)
def create_item_category(
    payload: InventoryCategoryCreate,
    _current_user: dict[str, Any] = Depends(require_system_admin),
    db: Session = Depends(get_db),
) -> InventoryCategoryPublic:
    return inventory_service.create_item_category(db=db, name=payload.name)


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
        if response.status_code == status.HTTP_403_FORBIDDEN:
            # If user isn't assigned to the room, allow system admins to access via admin endpoint.
            response = await client.get(
                f"{settings.location_service_url}/rooms/{room_id}",
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


@router.post("/import/preview", response_model=InventoryImportPreviewResponse)
async def preview_import_items(
    file: UploadFile = File(...),
    _current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> InventoryImportPreviewResponse:
    content = await file.read()
    rows = inventory_import_service.parse_import_file(filename=file.filename or "", content=content)
    return await inventory_import_service.build_preview(
        token=credentials.credentials,
        rows=rows,
        db=db,
    )


@router.post(
    "/import/confirm",
    response_model=InventoryImportConfirmResponse,
    status_code=status.HTTP_201_CREATED,
)
async def confirm_import_items(
    file: UploadFile = File(...),
    create_missing_locations: bool = Query(default=True),
    create_missing_users: bool = Query(default=True),
    _current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> InventoryImportConfirmResponse:
    content = await file.read()
    rows = inventory_import_service.parse_import_file(filename=file.filename or "", content=content)
    return await inventory_import_service.confirm_import(
        token=credentials.credentials,
        rows=rows,
        db=db,
        create_missing_locations=create_missing_locations,
        create_missing_users=create_missing_users,
    )


@router.post("/import/confirm-stream")
async def confirm_import_items_stream(
    request: Request,
    file: UploadFile = File(...),
    create_missing_locations: bool = Query(default=True),
    create_missing_users: bool = Query(default=True),
    _current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    content = await file.read()
    rows = inventory_import_service.parse_import_file(filename=file.filename or "", content=content)

    async def event_gen():
        async for chunk in inventory_import_service.confirm_import_stream(
            token=credentials.credentials,
            rows=rows,
            db=db,
            create_missing_locations=create_missing_locations,
            create_missing_users=create_missing_users,
        ):
            if await request.is_disconnected():
                break
            yield chunk

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


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

    generated_document_id: int | None = None
    generated_document_number: str | None = None
    if payload.generate_document:
        if not (isinstance(responsible_id, int) and responsible_id > 0):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="to_responsible_required_for_document",
            )

        unique_ids: list[int] = []
        seen: set[int] = set()
        for item_id in payload.item_ids:
            if item_id in seen:
                continue
            seen.add(item_id)
            unique_ids.append(item_id)

        existing_ids = (
            db.execute(select(InventoryItem.id).where(InventoryItem.id.in_(unique_ids)))
            .scalars()
            .all()
        )

        if existing_ids and len(existing_ids) == len(unique_ids):
            # Generate the document BEFORE moving, so it captures the current "from" responsible/location.
            try:
                with httpx.Client(timeout=10) as client:
                    response = client.post(
                        f"{settings.documents_service_url}/v1/documents/generate-batch",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "type_code": "TRANSFER_ACT",
                            "target_type": "equipment",
                            "target_ids": existing_ids,
                            "to_room_id": payload.location_id,
                            "to_responsible_id": responsible_id,
                            "include_pdf": True,
                        },
                    )
                if response.status_code != status.HTTP_200_OK:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="documents_service_error",
                    )
                data = response.json()
                if isinstance(data, dict):
                    doc_id = data.get("id")
                    doc_number = data.get("doc_number")
                    if isinstance(doc_id, int):
                        generated_document_id = doc_id
                    if isinstance(doc_number, str):
                        generated_document_number = doc_number
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="documents_service_unavailable",
                )

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
        generated_document_id=generated_document_id,
        generated_document_number=generated_document_number,
    )


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)) -> dict:
    return inventory_service.delete_item(item_id, db)
