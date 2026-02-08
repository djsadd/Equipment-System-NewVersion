"""add user profile fields

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-07 00:00:02.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("department_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("role", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "role")
    op.drop_column("users", "department_id")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
