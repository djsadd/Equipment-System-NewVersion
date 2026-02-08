from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "development")
        self.database_url = os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://auth:auth@postgres:5432/auth",
        )
        self.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
        self.algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expires_minutes = int(
            os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "15")
        )
        self.refresh_token_expires_days = int(
            os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "30")
        )
        self.system_admin_role = os.getenv("SYSTEM_ADMIN_ROLE", "system_admin")


settings = Settings()
