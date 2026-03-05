from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session

from app.clients import get_inventory_item, get_room, list_items_by_room, lookup_users
from app.core.config import settings
from app.models.document import GeneratedDocument
from app.models.enums import DocumentStatus, DocumentTargetType, DocumentTypeCode
from app.renderers.docx_renderer import render_docx
from app.renderers.pdf.libreoffice import convert_docx_to_pdf_bytes
from app.services import template_service


_RU_MONTHS_GENITIVE = {
    1: "января",
    2: "февраля",
    3: "марта",
    4: "апреля",
    5: "мая",
    6: "июня",
    7: "июля",
    8: "августа",
    9: "сентября",
    10: "октября",
    11: "ноября",
    12: "декабря",
}


def _format_date_ru(dt: datetime) -> str:
    month = _RU_MONTHS_GENITIVE.get(dt.month, str(dt.month))
    return f"{dt.day} {month} {dt.year} г."


def _format_datetime_ru(dt: datetime) -> str:
    return f"{_format_date_ru(dt)} {dt:%H:%M}"


def _format_date_ru_quoted(dt: datetime) -> str:
    month = _RU_MONTHS_GENITIVE.get(dt.month, str(dt.month))
    return f"«{dt.day}» {month} {dt.year} г."


def _format_datetime_ru_quoted(dt: datetime) -> str:
    return f"{_format_date_ru_quoted(dt)} {dt:%H:%M}"


def _pick_user_display(user: dict) -> str | None:
    if not isinstance(user, dict):
        return None
    full_name = user.get("full_name")
    if isinstance(full_name, str) and full_name.strip():
        return full_name.strip()
    first_name = user.get("first_name")
    last_name = user.get("last_name")
    parts = []
    if isinstance(last_name, str) and last_name.strip():
        parts.append(last_name.strip())
    if isinstance(first_name, str) and first_name.strip():
        parts.append(first_name.strip())
    return " ".join(parts) if parts else None


def list_documents(
    db: Session,
    *,
    type_code: str | None = None,
    target_type: str | None = None,
    target_id: int | None = None,
    equipment_id: int | None = None,
    room_id: int | None = None,
    responsible_user_id: int | None = None,
    generated_from: datetime | None = None,
    generated_to: datetime | None = None,
    q: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[GeneratedDocument]:
    stmt = _apply_list_documents_filters(
        select(GeneratedDocument),
        type_code=type_code,
        target_type=target_type,
        target_id=target_id,
        equipment_id=equipment_id,
        room_id=room_id,
        responsible_user_id=responsible_user_id,
        generated_from=generated_from,
        generated_to=generated_to,
        q=q,
    )
    stmt = stmt.order_by(GeneratedDocument.created_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def list_documents_page(
    db: Session,
    *,
    type_code: str | None = None,
    target_type: str | None = None,
    target_id: int | None = None,
    equipment_id: int | None = None,
    room_id: int | None = None,
    responsible_user_id: int | None = None,
    generated_from: datetime | None = None,
    generated_to: datetime | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[GeneratedDocument], int]:
    base = _apply_list_documents_filters(
        select(GeneratedDocument),
        type_code=type_code,
        target_type=target_type,
        target_id=target_id,
        equipment_id=equipment_id,
        room_id=room_id,
        responsible_user_id=responsible_user_id,
        generated_from=generated_from,
        generated_to=generated_to,
        q=q,
    )

    total_stmt = _apply_list_documents_filters(
        select(func.count()).select_from(GeneratedDocument),
        type_code=type_code,
        target_type=target_type,
        target_id=target_id,
        equipment_id=equipment_id,
        room_id=room_id,
        responsible_user_id=responsible_user_id,
        generated_from=generated_from,
        generated_to=generated_to,
        q=q,
    )

    items_stmt = base.order_by(GeneratedDocument.created_at.desc()).limit(limit).offset(offset)

    items = list(db.execute(items_stmt).scalars().all())
    total = int(db.execute(total_stmt).scalar_one() or 0)
    return items, total


def _apply_list_documents_filters(
    stmt,
    *,
    type_code: str | None,
    target_type: str | None,
    target_id: int | None,
    equipment_id: int | None,
    room_id: int | None,
    responsible_user_id: int | None,
    generated_from: datetime | None,
    generated_to: datetime | None,
    q: str | None,
):
    if type_code:
        stmt = stmt.where(GeneratedDocument.type_code == type_code)
    if target_type:
        stmt = stmt.where(GeneratedDocument.target_type == target_type)
    if target_id is not None:
        stmt = stmt.where(GeneratedDocument.target_id == target_id)
    if equipment_id is not None:
        stmt = stmt.where(
            or_(
                and_(
                    GeneratedDocument.target_type == DocumentTargetType.EQUIPMENT.value,
                    GeneratedDocument.target_id == equipment_id,
                ),
                GeneratedDocument.equipment_ids.contains([equipment_id]),
            )
        )
    if room_id is not None:
        stmt = stmt.where(GeneratedDocument.room_id == room_id)
    if responsible_user_id is not None:
        stmt = stmt.where(GeneratedDocument.responsible_user_id == responsible_user_id)
    if generated_from is not None:
        stmt = stmt.where(GeneratedDocument.generated_at >= generated_from)
    if generated_to is not None:
        stmt = stmt.where(GeneratedDocument.generated_at <= generated_to)
    if q is not None and q.strip():
        query = q.strip()
        stmt = stmt.where(
            or_(
                GeneratedDocument.doc_number.ilike(f"%{query}%"),
                GeneratedDocument.search_text.ilike(f"%{query}%"),
            )
        )
    return stmt


def get_document(document_id: int, db: Session) -> GeneratedDocument:
    doc = db.get(GeneratedDocument, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="document_not_found")
    return doc


def _apply_document_metadata(doc: GeneratedDocument, *, context: dict, target_type: str, target_id: int) -> None:
    room_id = None
    room_name = None
    if target_type == DocumentTargetType.ROOM.value:
        room_id = target_id
        v = context.get("room_number") or context.get("location_name")
        if isinstance(v, str) and v.strip():
            room_name = v.strip()
    else:
        v_room_id = context.get("location_id")
        if isinstance(v_room_id, int) and v_room_id > 0:
            room_id = v_room_id
        v_room_name = context.get("location_name")
        if isinstance(v_room_name, str) and v_room_name.strip():
            room_name = v_room_name.strip()

    responsible_user_id = context.get("responsible_id")
    if not isinstance(responsible_user_id, int) or responsible_user_id <= 0:
        responsible_user_id = None
    responsible_user_name = context.get("responsible_person")
    if not isinstance(responsible_user_name, str) or not responsible_user_name.strip():
        responsible_user_name = None

    to_room_id = context.get("to_room_id")
    if not isinstance(to_room_id, int) or to_room_id <= 0:
        to_room_id = None
    to_room_name = context.get("to_location_name") or context.get("to_room_number")
    if not isinstance(to_room_name, str) or not to_room_name.strip():
        to_room_name = None

    to_responsible_user_id = context.get("to_responsible_id")
    if not isinstance(to_responsible_user_id, int) or to_responsible_user_id <= 0:
        to_responsible_user_id = None
    to_responsible_user_name = context.get("to_responsible_person")
    if not isinstance(to_responsible_user_name, str) or not to_responsible_user_name.strip():
        to_responsible_user_name = None

    equipment_name = context.get("equipment_name")
    if not isinstance(equipment_name, str) or not equipment_name.strip():
        equipment_name = None
    inventory_number = context.get("inventory_number")
    if not isinstance(inventory_number, str) or not inventory_number.strip():
        inventory_number = None
    equipment_count = context.get("equipment_count")
    if not isinstance(equipment_count, int) or equipment_count < 0:
        equipment_count = None

    equipment_ids = context.get("equipment_ids")
    if not isinstance(equipment_ids, list) or not all(isinstance(v, int) for v in equipment_ids):
        equipment_ids = None

    equipment_list_text = context.get("equipment_list_text")
    if not isinstance(equipment_list_text, str) or not equipment_list_text.strip():
        equipment_list_text = None

    # For ROOM_PASSPORT: derive IDs from equipment_items if not explicitly provided.
    if equipment_ids is None:
        items = context.get("equipment_items")
        if isinstance(items, list):
            derived: list[int] = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_id = item.get("id")
                if isinstance(item_id, int):
                    derived.append(item_id)
            equipment_ids = derived or None

    doc.room_id = room_id
    doc.room_name = room_name
    doc.responsible_user_id = responsible_user_id
    doc.responsible_user_name = responsible_user_name
    doc.to_room_id = to_room_id
    doc.to_room_name = to_room_name
    doc.to_responsible_user_id = to_responsible_user_id
    doc.to_responsible_user_name = to_responsible_user_name
    doc.equipment_name = equipment_name
    doc.inventory_number = inventory_number
    doc.equipment_count = equipment_count
    doc.equipment_ids = equipment_ids
    doc.equipment_list_text = equipment_list_text

    searchable_parts = [
        doc.doc_number,
        doc.type_code,
        doc.template_version,
        doc.status,
        doc.target_type,
        str(doc.target_id),
        str(room_id) if isinstance(room_id, int) else None,
        room_name,
        str(responsible_user_id) if isinstance(responsible_user_id, int) else None,
        responsible_user_name,
        str(to_room_id) if isinstance(to_room_id, int) else None,
        to_room_name,
        str(to_responsible_user_id) if isinstance(to_responsible_user_id, int) else None,
        to_responsible_user_name,
        equipment_name,
        inventory_number,
        equipment_list_text,
        doc.notes,
    ]
    doc.search_text = "\n".join([p for p in searchable_parts if isinstance(p, str) and p.strip()]) or None


def _build_context(
    *,
    token: str,
    type_code: str,
    target_type: str,
    target_id: int,
    to_room_id: int | None,
    to_responsible_id: int | None,
    doc_number: str,
    template_version: str,
    generated_at: datetime,
) -> dict:
    base = {
        "document_number": doc_number,
        "template_version": template_version,
        "generation_date": generated_at.date().isoformat(),
        "generation_datetime": generated_at.isoformat(),
        "generation_date_ru": _format_date_ru(generated_at),
        "generation_datetime_ru": _format_datetime_ru(generated_at),
        "generation_date_ru_quoted": _format_date_ru_quoted(generated_at),
        "generation_datetime_ru_quoted": _format_datetime_ru_quoted(generated_at),
    }

    if type_code == DocumentTypeCode.ROOM_PASSPORT.value:
        room = get_room(
            token=token, location_service_url=settings.location_service_url, room_id=target_id
        )
        items = list_items_by_room(
            token=token, inventory_service_url=settings.inventory_service_url, room_id=target_id
        )
        responsible_id = room.get("responsible_id") if isinstance(room, dict) else None
        responsible_person = None
        if isinstance(responsible_id, int) and responsible_id > 0:
            looked = lookup_users(
                token=token, auth_service_url=settings.auth_service_url, ids=[responsible_id]
            )
            if looked:
                responsible_person = _pick_user_display(looked[0])

        equipment_lines: list[str] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            item_id = item.get("id")
            title = item.get("title")
            equipment_lines.append(
                f"{item_id if isinstance(item_id, int) else '-'}: {title if isinstance(title, str) else ''}".strip()
            )

        base.update(
            {
                "room": room,
                "room_number": room.get("name") or room.get("number") or str(target_id),
                "location_name": room.get("name") or room.get("number") or str(target_id),
                "responsible_id": responsible_id,
                "responsible_person": responsible_person,
                "equipment_items": items,
                "equipment_list_text": "\n".join(equipment_lines),
                "equipment_count": len(items),
            }
        )
        return base

    if type_code in (DocumentTypeCode.INVENTORY_CARD.value, DocumentTypeCode.TRANSFER_ACT.value):
        equipment = get_inventory_item(
            inventory_service_url=settings.inventory_service_url, item_id=target_id
        )
        responsible_id = equipment.get("responsible_id") if isinstance(equipment, dict) else None
        responsible_person = None
        if isinstance(responsible_id, int) and responsible_id > 0:
            looked = lookup_users(
                token=token, auth_service_url=settings.auth_service_url, ids=[responsible_id]
            )
            if looked:
                responsible_person = _pick_user_display(looked[0])

        location_id = equipment.get("location_id") if isinstance(equipment, dict) else None
        location_name = None
        location = None
        if isinstance(location_id, int) and location_id > 0:
            try:
                location = get_room(
                    token=token,
                    location_service_url=settings.location_service_url,
                    room_id=location_id,
                )
                if isinstance(location, dict):
                    location_name = location.get("name") or location.get("number")
            except HTTPException:
                location = None
                location_name = None

        base.update(
            {
                "equipment": equipment,
                "equipment_item": equipment,
                # Make templates reusable: allow `{% for item in equipment_items %}` even for single-equipment docs.
                "equipment_items": [equipment] if isinstance(equipment, dict) else [],
                "equipment_name": equipment.get("title") or str(target_id),
                "inventory_number": equipment.get("barcode_id") or "",
                "location_id": location_id,
                "location_name": location_name,
                "location": location,
                "responsible_id": responsible_id,
                "responsible_person": responsible_person,
            }
        )

        if type_code == DocumentTypeCode.TRANSFER_ACT.value:
            to_room = None
            to_location_name = None
            if isinstance(to_room_id, int) and to_room_id > 0:
                try:
                    to_room = get_room(
                        token=token,
                        location_service_url=settings.location_service_url,
                        room_id=to_room_id,
                    )
                    if isinstance(to_room, dict):
                        to_location_name = to_room.get("name") or to_room.get("number")
                except HTTPException:
                    to_room = None
                    to_location_name = None

            to_responsible_person = None
            if isinstance(to_responsible_id, int) and to_responsible_id > 0:
                looked = lookup_users(
                    token=token, auth_service_url=settings.auth_service_url, ids=[to_responsible_id]
                )
                if looked:
                    to_responsible_person = _pick_user_display(looked[0])

            base.update(
                {
                    "to_room_id": to_room_id,
                    "to_room": to_room,
                    "to_room_number": (
                        (to_room.get("name") or to_room.get("number"))
                        if isinstance(to_room, dict)
                        else (str(to_room_id) if isinstance(to_room_id, int) else None)
                    ),
                    "to_location_name": to_location_name,
                    "to_responsible_id": to_responsible_id,
                    "to_responsible_person": to_responsible_person,
                    "equipment_ids": [target_id],
                    "equipment_count": 1 if isinstance(equipment, dict) else 0,
                    "equipment_list_text": (
                        f"{target_id}: {equipment.get('title') if isinstance(equipment.get('title'), str) else ''}".strip()
                        if isinstance(equipment, dict)
                        else ""
                    ),
                }
            )
        return base

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown_document_type")


def generate_document(
    db: Session,
    *,
    token: str,
    type_code: str,
    target_type: str,
    target_id: int,
    to_room_id: int | None,
    to_responsible_id: int | None,
    generated_by_user_id: int,
    notes: str | None,
    include_pdf: bool,
) -> GeneratedDocument:
    if type_code == DocumentTypeCode.ROOM_PASSPORT.value and target_type != DocumentTargetType.ROOM.value:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_target_type")
    if type_code in (
        DocumentTypeCode.TRANSFER_ACT.value,
        DocumentTypeCode.INVENTORY_CARD.value,
    ) and target_type != DocumentTargetType.EQUIPMENT.value:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_target_type")

    template = template_service.get_active_template_for_type(type_code, db)

    generated_at = datetime.now(timezone.utc)
    doc = GeneratedDocument(
        doc_number="pending",
        type_code=type_code,
        template_id=template.id,
        template_version=template.version,
        generated_at=generated_at,
        generated_by_user_id=generated_by_user_id,
        status=DocumentStatus.GENERATED.value,
        target_type=target_type,
        target_id=target_id,
        notes=notes,
        docx_blob=b"",
        pdf_blob=None,
    )
    db.add(doc)
    db.flush()
    doc.doc_number = f"DOC-{generated_at.strftime('%Y%m%d')}-{doc.id}"

    context = _build_context(
        token=token,
        type_code=type_code,
        target_type=target_type,
        target_id=target_id,
        to_room_id=to_room_id,
        to_responsible_id=to_responsible_id,
        doc_number=doc.doc_number,
        template_version=template.version,
        generated_at=generated_at,
    )

    _apply_document_metadata(doc, context=context, target_type=target_type, target_id=target_id)

    docx_bytes = render_docx(template_docx=template.docx_blob, context=context)
    doc.docx_blob = docx_bytes

    if include_pdf:
        doc.pdf_blob = convert_docx_to_pdf_bytes(
            docx_bytes=docx_bytes, soffice_bin=settings.libreoffice_bin
        )

    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def _common_positive_int(equipments: list[dict], field: str) -> int | None:
    values: list[int] = []
    for eq in equipments:
        if not isinstance(eq, dict):
            return None
        v = eq.get(field)
        if not isinstance(v, int) or v <= 0:
            return None
        values.append(v)
    if not values:
        return None
    return values[0] if all(v == values[0] for v in values) else None


def _build_transfer_act_context_for_equipment_ids(
    *,
    token: str,
    target_ids: list[int],
    to_room_id: int | None,
    to_responsible_id: int | None,
    doc_number: str,
    template_version: str,
    generated_at: datetime,
) -> dict:
    equipments: list[dict] = []
    equipment_lines: list[str] = []
    for item_id in target_ids:
        equipment = get_inventory_item(inventory_service_url=settings.inventory_service_url, item_id=item_id)
        equipments.append(equipment if isinstance(equipment, dict) else {})
        title = equipment.get("title") if isinstance(equipment, dict) else None
        equipment_lines.append(f"{item_id}: {title if isinstance(title, str) else ''}".strip())

    first_equipment = equipments[0] if equipments else {}

    responsible_id = _common_positive_int(equipments, "responsible_id")
    responsible_person = None
    if isinstance(responsible_id, int) and responsible_id > 0:
        looked = lookup_users(token=token, auth_service_url=settings.auth_service_url, ids=[responsible_id])
        if looked:
            responsible_person = _pick_user_display(looked[0])

    location_id = _common_positive_int(equipments, "location_id")
    location_name = None
    location = None
    if isinstance(location_id, int) and location_id > 0:
        try:
            location = get_room(
                token=token,
                location_service_url=settings.location_service_url,
                room_id=location_id,
            )
            if isinstance(location, dict):
                location_name = location.get("name") or location.get("number")
        except HTTPException:
            location = None
            location_name = None

    to_room = None
    to_location_name = None
    if isinstance(to_room_id, int) and to_room_id > 0:
        try:
            to_room = get_room(
                token=token,
                location_service_url=settings.location_service_url,
                room_id=to_room_id,
            )
            if isinstance(to_room, dict):
                to_location_name = to_room.get("name") or to_room.get("number")
        except HTTPException:
            to_room = None
            to_location_name = None

    to_responsible_person = None
    if isinstance(to_responsible_id, int) and to_responsible_id > 0:
        looked = lookup_users(
            token=token, auth_service_url=settings.auth_service_url, ids=[to_responsible_id]
        )
        if looked:
            to_responsible_person = _pick_user_display(looked[0])

    base: dict = {
        "document_number": doc_number,
        "template_version": template_version,
        "generation_date": generated_at.date().isoformat(),
        "generation_datetime": generated_at.isoformat(),
        "generation_date_ru": _format_date_ru(generated_at),
        "generation_datetime_ru": _format_datetime_ru(generated_at),
        "generation_date_ru_quoted": _format_date_ru_quoted(generated_at),
        "generation_datetime_ru_quoted": _format_datetime_ru_quoted(generated_at),
    }

    equipment_name = None
    if len(equipments) == 1 and isinstance(first_equipment, dict):
        equipment_name = first_equipment.get("title")
    if not isinstance(equipment_name, str) or not equipment_name.strip():
        equipment_name = f"Несколько единиц ({len(equipments)})"

    base.update(
        {
            # Backward-compatible single-equipment aliases
            "equipment": first_equipment,
            "equipment_item": first_equipment,
            "equipment_name": equipment_name,
            "inventory_number": first_equipment.get("barcode_id") if isinstance(first_equipment, dict) else "",
            # Batch-friendly fields
            "equipment_items": equipments,
            "equipment_list_text": "\n".join(equipment_lines),
            "equipment_count": len(equipments),
            "location_id": location_id,
            "location_name": location_name,
            "location": location,
            "responsible_id": responsible_id,
            "responsible_person": responsible_person,
            "equipment_ids": target_ids,
            "to_room_id": to_room_id,
            "to_room": to_room,
            "to_room_number": (
                (to_room.get("name") or to_room.get("number"))
                if isinstance(to_room, dict)
                else (str(to_room_id) if isinstance(to_room_id, int) else None)
            ),
            "to_location_name": to_location_name,
            "to_responsible_id": to_responsible_id,
            "to_responsible_person": to_responsible_person,
        }
    )
    return base


def generate_document_batch(
    db: Session,
    *,
    token: str,
    type_code: str,
    target_type: str,
    target_ids: list[int],
    to_room_id: int | None,
    to_responsible_id: int | None,
    generated_by_user_id: int,
    notes: str | None,
    include_pdf: bool,
) -> GeneratedDocument:
    if not target_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="target_ids_required")
    if type_code != DocumentTypeCode.TRANSFER_ACT.value:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="batch_not_supported")
    if target_type != DocumentTargetType.EQUIPMENT.value:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_target_type")

    template = template_service.get_active_template_for_type(type_code, db)

    generated_at = datetime.now(timezone.utc)
    doc = GeneratedDocument(
        doc_number="pending",
        type_code=type_code,
        template_id=template.id,
        template_version=template.version,
        generated_at=generated_at,
        generated_by_user_id=generated_by_user_id,
        status=DocumentStatus.GENERATED.value,
        target_type=target_type,
        target_id=target_ids[0],
        notes=notes,
        docx_blob=b"",
        pdf_blob=None,
    )
    db.add(doc)
    db.flush()
    doc.doc_number = f"DOC-{generated_at.strftime('%Y%m%d')}-{doc.id}"

    context = _build_transfer_act_context_for_equipment_ids(
        token=token,
        target_ids=target_ids,
        to_room_id=to_room_id,
        to_responsible_id=to_responsible_id,
        doc_number=doc.doc_number,
        template_version=template.version,
        generated_at=generated_at,
    )

    _apply_document_metadata(doc, context=context, target_type=target_type, target_id=target_ids[0])

    docx_bytes = render_docx(template_docx=template.docx_blob, context=context)
    doc.docx_blob = docx_bytes

    if include_pdf:
        doc.pdf_blob = convert_docx_to_pdf_bytes(
            docx_bytes=docx_bytes, soffice_bin=settings.libreoffice_bin
        )

    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def archive_document(document_id: int, db: Session) -> GeneratedDocument:
    doc = get_document(document_id, db)
    if doc.status == DocumentStatus.ARCHIVED.value:
        return doc
    now = datetime.now(timezone.utc)
    db.execute(
        update(GeneratedDocument)
        .where(GeneratedDocument.id == document_id)
        .values(status=DocumentStatus.ARCHIVED.value, archived_at=now)
    )
    db.commit()
    return get_document(document_id, db)
