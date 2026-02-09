from __future__ import annotations

from typing import Iterable, Mapping, Optional

import httpx
from fastapi import Request, Response

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


def _filtered_headers(headers: Mapping[str, str]) -> dict:
    filtered = {}
    for key, value in headers.items():
        if key.lower() in HOP_BY_HOP_HEADERS or key.lower() == "host":
            continue
        filtered[key] = value
    return filtered


def _merge_x_forwarded(request: Request, headers: dict) -> None:
    client_host = request.client.host if request.client else ""
    headers.setdefault("X-Forwarded-For", client_host)
    headers.setdefault("X-Forwarded-Proto", request.url.scheme)
    headers.setdefault("X-Forwarded-Host", request.headers.get("host", ""))


def _filter_response_headers(headers: Iterable[tuple[str, str]]) -> dict:
    filtered = {}
    for key, value in headers:
        if key.lower() in HOP_BY_HOP_HEADERS:
            continue
        filtered[key] = value
    return filtered


async def forward_request(
    client: httpx.AsyncClient,
    request: Request,
    upstream: str,
    upstream_path: str,
) -> Response:
    if upstream_path:
        url = upstream.rstrip("/") + "/" + upstream_path.lstrip("/")
    else:
        url = upstream.rstrip("/")
    if request.url.query:
        url = f"{url}?{request.url.query}"

    headers = _filtered_headers(request.headers)
    _merge_x_forwarded(request, headers)

    body = await request.body()

    response = await client.request(
        request.method,
        url,
        headers=headers,
        content=body,
    )

    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=_filter_response_headers(response.headers.items()),
    )
