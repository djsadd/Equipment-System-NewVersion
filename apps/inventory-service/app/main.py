from __future__ import annotations

from fastapi import FastAPI

from app.api.v1.router import router as api_v1_router
from app.core.config import settings
from app.core.events import create_start_app

app = FastAPI(title="Inventory Service", version="1.0.0")
app.include_router(api_v1_router)
create_start_app(app)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "env": settings.env}
