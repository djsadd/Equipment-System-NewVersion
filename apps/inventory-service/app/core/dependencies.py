from __future__ import annotations

from sqlalchemy.orm import Session

from app.db import SessionLocal


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
