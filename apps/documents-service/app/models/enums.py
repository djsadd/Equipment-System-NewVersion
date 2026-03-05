from __future__ import annotations

from enum import Enum


class DocumentTypeCode(str, Enum):
    TRANSFER_ACT = "TRANSFER_ACT"
    ROOM_PASSPORT = "ROOM_PASSPORT"
    INVENTORY_CARD = "INVENTORY_CARD"


class DocumentTemplateStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class DocumentStatus(str, Enum):
    GENERATED = "generated"
    ARCHIVED = "archived"


class DocumentTargetType(str, Enum):
    EQUIPMENT = "equipment"
    ROOM = "room"

