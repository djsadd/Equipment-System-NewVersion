from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "development")
        self.database_url = (
            os.getenv("NOTIFICATIONS_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or "postgresql+psycopg://auth:auth@postgres:5432/notifications"
        )

        self.auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://auth:8000")
        self.internal_token = os.getenv("NOTIFICATION_INTERNAL_TOKEN", "")


settings = Settings()

