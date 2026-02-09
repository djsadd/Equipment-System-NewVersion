from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "development")
        self.database_url = (
            os.getenv("DEPARTMENTS_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or "postgresql+psycopg://auth:auth@postgres:5432/departments"
        )
        self.auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://auth:8000")
        self.system_admin_role = os.getenv("SYSTEM_ADMIN_ROLE", "system_admin")


settings = Settings()
