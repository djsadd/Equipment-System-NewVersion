from __future__ import annotations

from fastapi import FastAPI

from app.api.v1.router import router as api_v1_router

app = FastAPI(title="Location Service")
app.include_router(api_v1_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
