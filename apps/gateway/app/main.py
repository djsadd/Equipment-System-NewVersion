from __future__ import annotations

from typing import Callable

import httpx
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import Route, settings
from app.proxy import forward_request

app = FastAPI(title="API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
async def startup() -> None:
    app.state.http_client = httpx.AsyncClient(timeout=settings.timeout_seconds)


@app.on_event("shutdown")
async def shutdown() -> None:
    await app.state.http_client.aclose()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "env": settings.env}


@app.get("/routes")
async def routes() -> dict:
    return {
        "routes": [
            {"name": r.name, "path": r.path, "upstream": r.upstream}
            for r in settings.gateway_routes
        ]
    }


def register_proxy_route(route: Route) -> None:
    router = APIRouter(prefix=route.path)

    async def handler(request: Request, path: str = ""):
        client = app.state.http_client
        return await forward_request(client, request, route.upstream, path)

    methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
    router.add_api_route("", handler, methods=methods)
    router.add_api_route("/{path:path}", handler, methods=methods)

    app.include_router(router)


for route in settings.gateway_routes:
    register_proxy_route(route)


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(
        status_code=502,
        content={"error": "gateway_error", "detail": str(exc)},
    )
