"""init location

Revision ID: 4b1d8b3b6c1b
Revises: 
Create Date: 2026-02-08 22:20:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "4b1d8b3b6c1b"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("room_type", sa.String(length=100), nullable=False),
        sa.Column("responsible_id", sa.Integer(), nullable=True),
        sa.Column("last_inventory_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_audit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_rooms_name"), "rooms", ["name"], unique=False)
    op.create_index(op.f("ix_rooms_room_type"), "rooms", ["room_type"], unique=False)
    op.create_index(
        op.f("ix_rooms_responsible_id"), "rooms", ["responsible_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_rooms_responsible_id"), table_name="rooms")
    op.drop_index(op.f("ix_rooms_room_type"), table_name="rooms")
    op.drop_index(op.f("ix_rooms_name"), table_name="rooms")
    op.drop_table("rooms")
