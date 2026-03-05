from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_documents_admin
from app.schemas import DocumentTemplatePublic
from app.services import template_service

router = APIRouter(prefix="/templates", tags=["document-templates"])


@router.get("", response_model=list[DocumentTemplatePublic])
def list_templates(
    type_code: str | None = None,
    include_archived: bool = False,
    _current_user: dict[str, Any] = Depends(require_documents_admin),
    db: Session = Depends(get_db),
) -> list[DocumentTemplatePublic]:
    return template_service.list_templates(
        db, type_code=type_code, include_archived=include_archived
    )


@router.post("", response_model=DocumentTemplatePublic, status_code=status.HTTP_201_CREATED)
def upload_template(
    type_code: str = Form(...),
    version: str = Form(...),
    effective_from: date | None = Form(default=None),
    make_active: bool = Form(default=True),
    file: UploadFile = File(...),
    _current_user: dict[str, Any] = Depends(require_documents_admin),
    db: Session = Depends(get_db),
) -> DocumentTemplatePublic:
    blob = file.file.read()
    return template_service.create_template(
        db,
        type_code=type_code,
        version=version,
        effective_from=effective_from,
        original_filename=file.filename,
        docx_blob=blob,
        make_active=make_active,
    )


@router.post("/{template_id}/activate", response_model=DocumentTemplatePublic)
def activate_template(
    template_id: int,
    _current_user: dict[str, Any] = Depends(require_documents_admin),
    db: Session = Depends(get_db),
) -> DocumentTemplatePublic:
    return template_service.activate_template(template_id, db)


@router.post("/{template_id}/archive", response_model=DocumentTemplatePublic)
def archive_template(
    template_id: int,
    _current_user: dict[str, Any] = Depends(require_documents_admin),
    db: Session = Depends(get_db),
) -> DocumentTemplatePublic:
    return template_service.archive_template(template_id, db)

