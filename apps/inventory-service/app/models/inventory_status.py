from __future__ import annotations

from enum import Enum


class InventoryStatus(str, Enum):
    NEW = "Новое"
    IN_REPAIR = "В ремонте"
    REPAIRED = "Отремонтировано"
    WRITTEN_OFF = "Списано"
    IN_STOCK = "На складе"
    ISSUED = "Выдано"
