from __future__ import annotations

from fastapi import FastAPI

from app.db import Base, engine


def create_start_app(app: FastAPI) -> None:
    @app.on_event("startup")
    def start_app() -> None:
        Base.metadata.create_all(bind=engine)

