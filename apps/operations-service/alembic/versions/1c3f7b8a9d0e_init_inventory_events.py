"""init inventory events

Revision ID: 1c3f7b8a9d0e
Revises:
Create Date: 2026-02-10 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "1c3f7b8a9d0e"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inventory_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("from_location_id", sa.Integer(), nullable=True),
        sa.Column("to_location_id", sa.Integer(), nullable=True),
        sa.Column("from_responsible_id", sa.Integer(), nullable=True),
        sa.Column("to_responsible_id", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_inventory_events_item_id"),
        "inventory_events",
        ["item_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inventory_events_actor_user_id"),
        "inventory_events",
        ["actor_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inventory_events_event_type"),
        "inventory_events",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inventory_events_created_at"),
        "inventory_events",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inventory_events_created_at"), table_name="inventory_events")
    op.drop_index(op.f("ix_inventory_events_event_type"), table_name="inventory_events")
    op.drop_index(op.f("ix_inventory_events_actor_user_id"), table_name="inventory_events")
    op.drop_index(op.f("ix_inventory_events_item_id"), table_name="inventory_events")
    op.drop_table("inventory_events")

