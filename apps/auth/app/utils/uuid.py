from __future__ import annotations

from uuid import uuid4


def uuid_hex() -> str:
    return uuid4().hex
