from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import require_system_admin
from app.schemas import PrintRequest
from app.services.print_service import forward_print_request, tcp_print_zpl

router = APIRouter(tags=["print"])
logger = logging.getLogger(__name__)


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else None


@router.post("/print", dependencies=[Depends(require_system_admin)])
def print_label(request: Request, payload: PrintRequest):
    client_ip = _get_client_ip(request)

    zpl_code = payload.zpl_data.strip()
    if not zpl_code:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="zpl_data_required",
        )

    normalized_payload = payload.model_copy(update={"zpl_data": zpl_code})

    logger.info("Print request received", extra={"client_ip": client_ip})

    if normalized_payload.printer_host or normalized_payload.backend in {"tcp", "raw_tcp"}:
        return tcp_print_zpl(normalized_payload)

    return forward_print_request(normalized_payload, client_ip=client_ip)

