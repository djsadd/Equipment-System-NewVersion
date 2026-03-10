from __future__ import annotations

import logging
import subprocess

from fastapi import FastAPI

from app.db import Base, engine
from app.core.config import settings


def create_start_app(app: FastAPI) -> None:
    @app.on_event("startup")
    def start_app() -> None:
        Base.metadata.create_all(bind=engine)

        # Best-effort diagnostic: in Docker, PDF conversion depends on fonts installed in the container.
        # If the configured font is missing, LibreOffice will substitute another one.
        try:
            result = subprocess.run(
                ["fc-list"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=5,
                text=True,
            )
            if result.returncode == 0:
                haystack = result.stdout.lower()
                needle = settings.document_font_name.lower()
                if needle not in haystack:
                    logging.getLogger(__name__).warning(
                        "Configured DOCUMENT_FONT_NAME=%r not found in fc-list output; PDFs may use a substitute font",
                        settings.document_font_name,
                    )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
