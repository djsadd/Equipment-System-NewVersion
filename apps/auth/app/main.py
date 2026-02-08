from __future__ import annotations

from fastapi import FastAPI

from app.api.v1.router import router as api_v1_router
from app.core.config import settings
from app.services import auth_service

app = FastAPI(title="Auth Service", version="1.0.0")
app.include_router(api_v1_router)


@app.on_event("startup")
def on_startup() -> None:
    auth_service.ensure_system_admin_role()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "env": settings.env}
