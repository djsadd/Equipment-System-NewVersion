import json
import os
from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Route:
    name: str
    path: str
    upstream: str


DEFAULT_ROUTES: List[Route] = [
    Route(name="reports", path="/reports", upstream="http://reports:8000"),
    Route(name="invetory", path="/invetory", upstream="http://inventory:8000"),
    Route(name="cabinets", path="/cabinets", upstream="http://cabinets:8000"),
    Route(name="departments", path="/departments", upstream="http://departments:8000/departments"),
    Route(name="notifications", path="/notifications", upstream="http://notifications:8000"),
    Route(name="analytics", path="/analytics", upstream="http://analytics:8000"),
    Route(name="inventory", path="/inventory", upstream="http://inventory:8000"),
    Route(name="inventory-audit", path="/inventory-audit", upstream="http://inventory-audit:8000"),
    Route(name="operations", path="/operations", upstream="http://operations:8000"),
    Route(name="documents", path="/documents", upstream="http://documents:8000"),
    Route(name="storage", path="/storage", upstream="http://storage:8000"),
    Route(name="auth", path="/auth", upstream="http://auth:8000/auth"),
    Route(name="admin", path="/admin", upstream="http://auth:8000/admin"),
    Route(name="barcode", path="/barcode", upstream="http://barcode:8000"),
]


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "development")
        self.gateway_routes = self._load_routes()
        self.cors_allow_origins = self._load_cors_origins()
        self.timeout_seconds = float(os.getenv("GATEWAY_TIMEOUT", "60"))

    def _load_routes(self) -> List[Route]:
        raw = os.getenv("GATEWAY_ROUTES", "[]").strip()
        if not raw or raw == "[]":
            return DEFAULT_ROUTES

        try:
            items = json.loads(raw)
        except json.JSONDecodeError:
            return DEFAULT_ROUTES

        routes: List[Route] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or item.get("path") or "route")
            path = str(item.get("path") or "").strip()
            upstream = str(item.get("upstream") or "").strip()
            if not path or not upstream:
                continue
            if not path.startswith("/"):
                path = "/" + path
            routes.append(Route(name=name, path=path, upstream=upstream))

        return routes or DEFAULT_ROUTES

    def _load_cors_origins(self) -> List[str]:
        raw = os.getenv("CORS_ALLOW_ORIGINS", "*")
        origins = [o.strip() for o in raw.split(",") if o.strip()]
        return origins or ["*"]


settings = Settings()
