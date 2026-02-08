from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "development")
        self.database_url = (
            os.getenv("INVENTORY_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or "postgresql+psycopg://inventory:inventory@postgres:5432/inventory"
        )
        self.auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://auth:8000")
        self.location_service_url = os.getenv(
            "LOCATION_SERVICE_URL", "http://location:8000"
        )


settings = Settings()
