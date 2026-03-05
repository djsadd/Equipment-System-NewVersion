from __future__ import annotations

from typing import Any

from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_db,
    require_documents_viewer,
    require_system_admin,
    security,
)
from app.schemas import (
    DocumentGenerateBatchRequest,
    DocumentGenerateRequest,
    GeneratedDocumentPagePublic,
    GeneratedDocumentPublic,
)
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[GeneratedDocumentPublic])
def list_documents(
    type_code: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    target_id: int | None = Query(default=None),
    equipment_id: int | None = Query(default=None),
    room_id: int | None = Query(default=None),
    responsible_user_id: int | None = Query(default=None),
    generated_from: date | None = Query(default=None),
    generated_to: date | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _current_user: dict[str, Any] = Depends(require_documents_viewer),
    db: Session = Depends(get_db),
) -> list[GeneratedDocumentPublic]:
    generated_from_dt: datetime | None = None
    generated_to_dt: datetime | None = None
    if generated_from is not None:
        generated_from_dt = datetime.combine(generated_from, time.min, tzinfo=timezone.utc)
    if generated_to is not None:
        # inclusive end-of-day
        generated_to_dt = datetime.combine(generated_to + timedelta(days=1), time.min, tzinfo=timezone.utc) - timedelta(microseconds=1)

    return document_service.list_documents(
        db,
        type_code=type_code,
        target_type=target_type,
        target_id=target_id,
        equipment_id=equipment_id,
        room_id=room_id,
        responsible_user_id=responsible_user_id,
        generated_from=generated_from_dt,
        generated_to=generated_to_dt,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/page", response_model=GeneratedDocumentPagePublic)
def list_documents_page(
    type_code: str | None = Query(default=None),
    equipment_id: int | None = Query(default=None),
    room_id: int | None = Query(default=None),
    responsible_user_id: int | None = Query(default=None),
    generated_from: date | None = Query(default=None),
    generated_to: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _current_user: dict[str, Any] = Depends(require_documents_viewer),
    db: Session = Depends(get_db),
) -> GeneratedDocumentPagePublic:
    generated_from_dt: datetime | None = None
    generated_to_dt: datetime | None = None
    if generated_from is not None:
        generated_from_dt = datetime.combine(generated_from, time.min, tzinfo=timezone.utc)
    if generated_to is not None:
        generated_to_dt = datetime.combine(generated_to + timedelta(days=1), time.min, tzinfo=timezone.utc) - timedelta(microseconds=1)

    items, total = document_service.list_documents_page(
        db,
        type_code=type_code,
        equipment_id=equipment_id,
        room_id=room_id,
        responsible_user_id=responsible_user_id,
        generated_from=generated_from_dt,
        generated_to=generated_to_dt,
        limit=limit,
        offset=offset,
    )
    return GeneratedDocumentPagePublic(items=items, total=total, limit=limit, offset=offset)


@router.get("/{document_id}", response_model=GeneratedDocumentPublic)
def get_document(
    document_id: int,
    _current_user: dict[str, Any] = Depends(require_documents_viewer),
    db: Session = Depends(get_db),
) -> GeneratedDocumentPublic:
    return document_service.get_document(document_id, db)


@router.post("/generate", response_model=GeneratedDocumentPublic)
def generate_document(
    payload: DocumentGenerateRequest,
    current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> GeneratedDocumentPublic:
    token = credentials.credentials

    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    return document_service.generate_document(
        db,
        token=token,
        type_code=payload.type_code,
        target_type=payload.target_type,
        target_id=payload.target_id,
        to_room_id=payload.to_room_id,
        to_responsible_id=payload.to_responsible_id,
        generated_by_user_id=user_id,
        notes=payload.notes,
        include_pdf=payload.include_pdf,
    )


@router.post("/admin/generate", response_model=GeneratedDocumentPublic)
def generate_document_admin(
    payload: DocumentGenerateRequest,
    current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> GeneratedDocumentPublic:
    token = credentials.credentials

    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    return document_service.generate_document(
        db,
        token=token,
        type_code=payload.type_code,
        target_type=payload.target_type,
        target_id=payload.target_id,
        to_room_id=payload.to_room_id,
        to_responsible_id=payload.to_responsible_id,
        generated_by_user_id=user_id,
        notes=payload.notes,
        include_pdf=payload.include_pdf,
    )


@router.post("/generate-batch", response_model=GeneratedDocumentPublic)
def generate_document_batch(
    payload: DocumentGenerateBatchRequest,
    current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> GeneratedDocumentPublic:
    token = credentials.credentials

    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    return document_service.generate_document_batch(
        db,
        token=token,
        type_code=payload.type_code,
        target_type=payload.target_type,
        target_ids=payload.target_ids,
        to_room_id=payload.to_room_id,
        to_responsible_id=payload.to_responsible_id,
        generated_by_user_id=user_id,
        notes=payload.notes,
        include_pdf=payload.include_pdf,
    )


@router.post("/admin/generate-batch", response_model=GeneratedDocumentPublic)
def generate_document_batch_admin(
    payload: DocumentGenerateBatchRequest,
    current_user: dict[str, Any] = Depends(require_system_admin),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> GeneratedDocumentPublic:
    token = credentials.credentials

    user_id = current_user.get("id") if isinstance(current_user, dict) else None
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    return document_service.generate_document_batch(
        db,
        token=token,
        type_code=payload.type_code,
        target_type=payload.target_type,
        target_ids=payload.target_ids,
        to_room_id=payload.to_room_id,
        to_responsible_id=payload.to_responsible_id,
        generated_by_user_id=user_id,
        notes=payload.notes,
        include_pdf=payload.include_pdf,
    )


@router.get("/{document_id}/file")
def download_file(
    document_id: int,
    format: str = Query(default="docx", pattern="^(docx|pdf)$"),
    _current_user: dict[str, Any] = Depends(require_documents_viewer),
    db: Session = Depends(get_db),
) -> Response:
    doc = document_service.get_document(document_id, db)
    if format == "pdf":
        if doc.pdf_blob is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="pdf_not_available")
        return Response(
            content=doc.pdf_blob,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{doc.doc_number}.pdf"'},
        )
    return Response(
        content=doc.docx_blob,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{doc.doc_number}.docx"'},
    )
