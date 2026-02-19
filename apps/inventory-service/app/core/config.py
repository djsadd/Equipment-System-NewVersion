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
        self.operations_service_url = os.getenv(
            "OPERATIONS_SERVICE_URL", "http://operations:8000"
        )
        self.system_admin_role = os.getenv("SYSTEM_ADMIN_ROLE", "system_admin")
        self.inventory_auditor_role = os.getenv("INVENTORY_AUDITOR_ROLE", "inventory_auditor")


settings = Settings()
