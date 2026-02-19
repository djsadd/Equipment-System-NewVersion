from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "development")
        self.database_url = (
            os.getenv("AUDIT_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or "postgresql+psycopg://auth:auth@postgres:5432/audit"
        )

        self.auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://auth:8000")
        self.inventory_service_url = os.getenv(
            "INVENTORY_SERVICE_URL", "http://inventory:8000"
        )
        self.location_service_url = os.getenv("LOCATION_SERVICE_URL", "http://location:8000")
        self.departments_service_url = os.getenv(
            "DEPARTMENTS_SERVICE_URL", "http://departments:8000"
        )
        self.operations_service_url = os.getenv(
            "OPERATIONS_SERVICE_URL", "http://operations:8000"
        )
        self.notification_service_url = os.getenv(
            "NOTIFICATION_SERVICE_URL", "http://notifications:8000"
        )
        self.notification_internal_token = os.getenv("NOTIFICATION_INTERNAL_TOKEN", "")

        self.system_admin_role = os.getenv("SYSTEM_ADMIN_ROLE", "system_admin")
        self.audit_auditor_role = os.getenv("AUDIT_AUDITOR_ROLE", "inventory_auditor")
        self.audit_supervisor_role = os.getenv(
            "AUDIT_SUPERVISOR_ROLE", "inventory_audit_supervisor"
        )


settings = Settings()
