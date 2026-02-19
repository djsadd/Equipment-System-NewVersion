from __future__ import annotations

from pydantic import BaseModel, Field


class PrintRequest(BaseModel):
    zpl_data: str = Field(min_length=1)
    printer_host: str | None = None
    printer_port: int | None = None
    printer_name: str | None = None
    printer_timeout: float | None = None
    backend: str | None = None
    verify_tcp: bool | None = None
    return_diagnostics: bool | None = None


class PrintResponse(BaseModel):
    ok: bool = True
    host: str
    port: int
    bytes_sent: int
    diagnostics: dict[str, object] | None = None
