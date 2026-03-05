from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.document_template import DocumentTemplate
from app.models.enums import DocumentTemplateStatus


def list_templates(
    db: Session, *, type_code: str | None = None, include_archived: bool = False
) -> list[DocumentTemplate]:
    stmt = select(DocumentTemplate)
    if type_code:
        stmt = stmt.where(DocumentTemplate.type_code == type_code)
    if not include_archived:
        stmt = stmt.where(DocumentTemplate.status == DocumentTemplateStatus.ACTIVE.value)
    stmt = stmt.order_by(DocumentTemplate.type_code.asc(), DocumentTemplate.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def get_template(template_id: int, db: Session) -> DocumentTemplate:
    template = db.get(DocumentTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="template_not_found")
    return template


def get_active_template_for_type(type_code: str, db: Session) -> DocumentTemplate:
    stmt = (
        select(DocumentTemplate)
        .where(DocumentTemplate.type_code == type_code)
        .where(DocumentTemplate.status == DocumentTemplateStatus.ACTIVE.value)
        .order_by(DocumentTemplate.created_at.desc())
        .limit(1)
    )
    template = db.execute(stmt).scalars().first()
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="active_template_missing"
        )
    return template


def create_template(
    db: Session,
    *,
    type_code: str,
    version: str,
    effective_from,
    original_filename: str | None,
    docx_blob: bytes,
    make_active: bool = True,
) -> DocumentTemplate:
    template = DocumentTemplate(
        type_code=type_code,
        version=version,
        effective_from=effective_from,
        status=DocumentTemplateStatus.ACTIVE.value
        if make_active
        else DocumentTemplateStatus.ARCHIVED.value,
        original_filename=original_filename,
        docx_blob=docx_blob,
    )
    db.add(template)
    db.flush()

    if make_active:
        db.execute(
            update(DocumentTemplate)
            .where(DocumentTemplate.type_code == type_code)
            .where(DocumentTemplate.id != template.id)
            .where(DocumentTemplate.status == DocumentTemplateStatus.ACTIVE.value)
            .values(
                status=DocumentTemplateStatus.ARCHIVED.value,
                archived_at=datetime.now(timezone.utc),
            )
        )

    db.commit()
    db.refresh(template)
    return template


def activate_template(template_id: int, db: Session) -> DocumentTemplate:
    template = get_template(template_id, db)
    db.execute(
        update(DocumentTemplate)
        .where(DocumentTemplate.type_code == template.type_code)
        .where(DocumentTemplate.status == DocumentTemplateStatus.ACTIVE.value)
        .values(
            status=DocumentTemplateStatus.ARCHIVED.value,
            archived_at=datetime.now(timezone.utc),
        )
    )
    template.status = DocumentTemplateStatus.ACTIVE.value
    template.archived_at = None
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def archive_template(template_id: int, db: Session) -> DocumentTemplate:
    template = get_template(template_id, db)
    if template.status == DocumentTemplateStatus.ARCHIVED.value:
        return template
    template.status = DocumentTemplateStatus.ARCHIVED.value
    template.archived_at = datetime.now(timezone.utc)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

