from __future__ import annotations

from fastapi import APIRouter

from app.models.enums import DocumentTypeCode
from app.schemas import DocumentTypePublic

router = APIRouter(prefix="/document-types", tags=["document-types"])

_TYPE_NAMES: dict[str, str] = {
    DocumentTypeCode.TRANSFER_ACT.value: "Акт приёма-передачи оборудования",
    DocumentTypeCode.ROOM_PASSPORT.value: "Паспорт аудитории",
    DocumentTypeCode.INVENTORY_CARD.value: "Инвентарная карточка оборудования",
}


@router.get("", response_model=list[DocumentTypePublic])
def list_document_types() -> list[DocumentTypePublic]:
    return [
        DocumentTypePublic(code=code, name=_TYPE_NAMES.get(code, code))
        for code in DocumentTypeCode
    ]

