"""add department_type to departments

Revision ID: b1a4d9a1c2f3
Revises: 7b2d1c4a9f0e
Create Date: 2026-03-10 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "b1a4d9a1c2f3"
down_revision = "7b2d1c4a9f0e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "departments",
        sa.Column("department_type", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("departments", "department_type")

