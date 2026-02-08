"""init inventory

Revision ID: f3a1c9e0b4d2
Revises: 
Create Date: 2026-02-08 00:00:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "f3a1c9e0b4d2"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "barcodes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("value", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("value"),
    )
    op.create_index("ix_barcodes_value", "barcodes", ["value"], unique=True)

    op.create_table(
        "inventory_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_inventory_types_name", "inventory_types", ["name"], unique=True)

    op.create_table(
        "inventory_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image", sa.String(length=1024), nullable=True),
        sa.Column("barcode_id", sa.Integer(), sa.ForeignKey("barcodes.id"), unique=True),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("responsible_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("last_inventory_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_audit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("inventory_type_id", sa.Integer(), sa.ForeignKey("inventory_types.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_inventory_items_title", "inventory_items", ["title"])
    op.create_index("ix_inventory_items_location_id", "inventory_items", ["location_id"])
    op.create_index("ix_inventory_items_responsible_id", "inventory_items", ["responsible_id"])
    op.create_index("ix_inventory_items_status", "inventory_items", ["status"])
    op.create_index("ix_inventory_items_category", "inventory_items", ["category"])

    op.create_table(
        "inventory_audits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "inventory_item_id",
            sa.Integer(),
            sa.ForeignKey("inventory_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("audited_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("auditor_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_inventory_audits_inventory_item_id",
        "inventory_audits",
        ["inventory_item_id"],
    )
    op.create_index("ix_inventory_audits_auditor_id", "inventory_audits", ["auditor_id"])


def downgrade() -> None:
    op.drop_index("ix_inventory_audits_auditor_id", table_name="inventory_audits")
    op.drop_index("ix_inventory_audits_inventory_item_id", table_name="inventory_audits")
    op.drop_table("inventory_audits")

    op.drop_index("ix_inventory_items_category", table_name="inventory_items")
    op.drop_index("ix_inventory_items_status", table_name="inventory_items")
    op.drop_index("ix_inventory_items_responsible_id", table_name="inventory_items")
    op.drop_index("ix_inventory_items_location_id", table_name="inventory_items")
    op.drop_index("ix_inventory_items_title", table_name="inventory_items")
    op.drop_table("inventory_items")

    op.drop_index("ix_inventory_types_name", table_name="inventory_types")
    op.drop_table("inventory_types")

    op.drop_index("ix_barcodes_value", table_name="barcodes")
    op.drop_table("barcodes")
