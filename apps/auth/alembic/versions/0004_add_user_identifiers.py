"""add user identifiers

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-04 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("iin", sa.String(length=12), nullable=True))
    op.add_column("users", sa.Column("person_id", sa.String(length=50), nullable=True))
    op.create_index("ix_users_iin", "users", ["iin"])
    op.create_index("ix_users_person_id", "users", ["person_id"])


def downgrade() -> None:
    op.drop_index("ix_users_person_id", table_name="users")
    op.drop_index("ix_users_iin", table_name="users")
    op.drop_column("users", "person_id")
    op.drop_column("users", "iin")
