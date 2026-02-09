"""add room types and room status

Revision ID: 9c6b2d7a1f5b
Revises: 4b1d8b3b6c1b
Create Date: 2026-02-08 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "9c6b2d7a1f5b"
down_revision = "4b1d8b3b6c1b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rooms",
        sa.Column("status", sa.String(length=50), server_default="Активен", nullable=False),
    )

    op.create_table(
        "room_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="Активен", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_room_types_name"), "room_types", ["name"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_room_types_name"), table_name="room_types")
    op.drop_table("room_types")
    op.drop_column("rooms", "status")
