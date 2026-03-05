from __future__ import annotations

from app.schemas.document import (
    DocumentGenerateBatchRequest,
    DocumentGenerateRequest,
    GeneratedDocumentPagePublic,
    GeneratedDocumentPublic,
)
from app.schemas.document_template import DocumentTemplateCreate, DocumentTemplatePublic
from app.schemas.document_type import DocumentTypePublic

__all__ = [
    "DocumentGenerateBatchRequest",
    "DocumentGenerateRequest",
    "DocumentTemplateCreate",
    "DocumentTemplatePublic",
    "DocumentTypePublic",
    "GeneratedDocumentPagePublic",
    "GeneratedDocumentPublic",
]
