from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "development")
        self.database_url = (
            os.getenv("DOCUMENTS_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or "postgresql+psycopg://auth:auth@postgres:5432/documents"
        )

        self.auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://auth:8000")
        self.inventory_service_url = os.getenv(
            "INVENTORY_SERVICE_URL", "http://inventory:8000"
        )
        self.location_service_url = os.getenv(
            "LOCATION_SERVICE_URL", "http://location:8000"
        )
        self.departments_service_url = os.getenv(
            "DEPARTMENTS_SERVICE_URL", "http://departments:8000"
        )

        self.system_admin_role = os.getenv("SYSTEM_ADMIN_ROLE", "system_admin")
        self.documents_admin_role = os.getenv("DOCUMENTS_ADMIN_ROLE", "documents_admin")
        self.documents_generator_role = os.getenv(
            "DOCUMENTS_GENERATOR_ROLE", "documents_generator"
        )
        self.documents_viewer_role = os.getenv("DOCUMENTS_VIEWER_ROLE", "documents_viewer")

        self.document_font_name = os.getenv("DOCUMENT_FONT_NAME", "Times New Roman")

        self.libreoffice_bin = os.getenv("LIBREOFFICE_BIN", "soffice")


settings = Settings()
