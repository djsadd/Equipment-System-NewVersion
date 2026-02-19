"""normalize barcode values to EAN-13 (append check digit)

Revision ID: 20260213_000003
Revises: 20260212_000002
Create Date: 2026-02-13 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260213_000003"
down_revision = "20260212_000002"
branch_labels = None
depends_on = None


def _compute_ean13_check_digit(value12: str) -> str:
    digits = [int(c) for c in value12]
    sum_odd = sum(digits[0::2])  # positions 1,3,5,7,9,11
    sum_even = sum(digits[1::2])  # positions 2,4,6,8,10,12
    total = sum_odd + 3 * sum_even
    return str((10 - (total % 10)) % 10)


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, value FROM barcodes WHERE value IS NOT NULL")).fetchall()

    for barcode_id, value in rows:
        if not isinstance(value, str):
            continue
        if len(value) != 12 or not value.isdigit():
            continue
        value13 = value + _compute_ean13_check_digit(value)
        try:
            conn.execute(
                sa.text("UPDATE barcodes SET value = :value WHERE id = :id"),
                {"value": value13, "id": int(barcode_id)},
            )
        except sa.exc.IntegrityError:
            continue


def downgrade() -> None:
    # Best-effort revert: strip check digit for values that look like valid EAN-13.
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, value FROM barcodes WHERE value IS NOT NULL")).fetchall()
    for barcode_id, value in rows:
        if not isinstance(value, str):
            continue
        if len(value) != 13 or not value.isdigit():
            continue
        payload12 = value[:12]
        if value[-1] != _compute_ean13_check_digit(payload12):
            continue
        conn.execute(
            sa.text("UPDATE barcodes SET value = :value WHERE id = :id"),
            {"value": payload12, "id": int(barcode_id)},
        )
