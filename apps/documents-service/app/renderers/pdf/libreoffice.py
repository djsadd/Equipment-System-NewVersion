from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from fastapi import HTTPException, status


def convert_docx_to_pdf_bytes(*, docx_bytes: bytes, soffice_bin: str) -> bytes:
    with tempfile.TemporaryDirectory(prefix="docs_pdf_") as tmp:
        tmpdir = Path(tmp)
        docx_path = tmpdir / "document.docx"
        pdf_path = tmpdir / "document.pdf"
        docx_path.write_bytes(docx_bytes)

        cmd = [
            soffice_bin,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--convert-to",
            "pdf",
            "--outdir",
            str(tmpdir),
            str(docx_path),
        ]
        try:
            result = subprocess.run(
                cmd,
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=60,
            )
        except FileNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="pdf_renderer_unavailable",
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="pdf_render_timeout",
            )

        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="pdf_render_failed",
            )

        if not pdf_path.exists():
            produced = list(tmpdir.glob("*.pdf"))
            if produced:
                return produced[0].read_bytes()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="pdf_render_failed",
            )

        return pdf_path.read_bytes()

