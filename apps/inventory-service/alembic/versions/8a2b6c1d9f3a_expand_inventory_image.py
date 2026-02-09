"""expand inventory image size

Revision ID: 8a2b6c1d9f3a
Revises: f3a1c9e0b4d2
Create Date: 2026-02-08 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "8a2b6c1d9f3a"
down_revision = "f3a1c9e0b4d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "inventory_items",
        "image",
        existing_type=sa.String(length=1024),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "inventory_items",
        "image",
        existing_type=sa.Text(),
        type_=sa.String(length=1024),
        existing_nullable=True,
    )
