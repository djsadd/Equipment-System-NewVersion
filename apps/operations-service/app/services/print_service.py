from __future__ import annotations

import socket
import time
from typing import Any
import requests
import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.print import PrintRequest, PrintResponse


def _validate_host(host: str) -> str:
    host = host.strip()
    if not host or len(host) > 255:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_printer_host")
    if "://" in host or "/" in host or "\\" in host or "\n" in host or "\r" in host or "\t" in host:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_printer_host")
    return host


def _validate_print_service_url(url: str) -> str:
    url = url.strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="print_service_url_required")

    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_print_service_url")

    return url


def forward_print_request(
    payload: PrintRequest,
    *,
    client_ip: str | None,
    print_service_url: str | None = None,
) -> dict[str, Any]:
    url = _validate_print_service_url(print_service_url or settings.print_service_url)
    timeout = settings.print_service_timeout
    if timeout <= 0 or timeout > 120:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="invalid_print_service_timeout")

    body: dict[str, Any] = {"zpl_data": payload.zpl_data}
    if client_ip:
        body["client_ip"] = client_ip

    try:
        response = httpx.post(url, json=body, timeout=timeout)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"print_service_connection_error: {exc}",
        ) from exc

    if response.status_code >= 400:
        detail: Any = None
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        data = response.json()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="print_service_invalid_json") from exc

    if isinstance(data, dict):
        return data
    return {"result": data}


def tcp_print_zpl(payload: PrintRequest) -> PrintResponse:
    if payload.backend and payload.backend not in {"tcp", "raw_tcp"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsupported_print_backend")

    if not payload.printer_host:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="printer_host_required")

    host = "192.168.112.169"
    port = 8001
    if port <= 0 or port > 65535:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_printer_port")

    timeout = float(payload.printer_timeout or 5)
    if timeout <= 0 or timeout > 60:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_printer_timeout")

    zpl = payload.zpl_data
    data = zpl.encode("utf-8")

    started = time.monotonic()
    fastapi_url = f"http://{host}:{port}/print"
    zpl_code = payload.zpl_data.strip()
    try:
        response = requests.post(
            fastapi_url,
            json={"zpl_data": zpl_code},
            timeout=getattr(settings, "PRINT_SERVICE_TIMEOUT", 10),
        )
        if response:
            print("YES")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"tcp_print_error: {exc}") from exc

    elapsed_ms = int((time.monotonic() - started) * 1000)
    diagnostics = None
    if payload.return_diagnostics:
        diagnostics = {
            "backend": payload.backend or "tcp",
            "printer_name": payload.printer_name,
            "elapsed_ms": elapsed_ms,
        }

    return PrintResponse(ok=True, host=host, port=port, bytes_sent=len(data), diagnostics=diagnostics)
