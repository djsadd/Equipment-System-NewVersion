"""add barcode assets and item links

Revision ID: 20260212_000002
Revises: 9c1b3a4f7d2e
Create Date: 2026-02-12 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260212_000002"
down_revision = "9c1b3a4f7d2e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "barcodes",
        "value",
        existing_type=sa.String(length=128),
        nullable=True,
        existing_nullable=False,
    )
    op.add_column("barcodes", sa.Column("title", sa.String(length=255), nullable=True))
    op.add_column(
        "barcodes", sa.Column("image_filename", sa.String(length=255), nullable=True)
    )
    op.add_column("barcodes", sa.Column("image_png", sa.LargeBinary(), nullable=True))
    op.add_column("barcodes", sa.Column("zpl_barcode", sa.Text(), nullable=True))

    op.create_table(
        "inventory_item_barcodes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "inventory_item_id",
            sa.Integer(),
            sa.ForeignKey("inventory_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "barcode_id",
            sa.Integer(),
            sa.ForeignKey("barcodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("inventory_item_id", "barcode_id", name="uq_item_barcode_pair"),
        sa.UniqueConstraint("barcode_id", name="uq_item_barcode_barcode_id"),
    )
    op.create_index(
        op.f("ix_inventory_item_barcodes_inventory_item_id"),
        "inventory_item_barcodes",
        ["inventory_item_id"],
    )
    op.create_index(
        op.f("ix_inventory_item_barcodes_barcode_id"),
        "inventory_item_barcodes",
        ["barcode_id"],
    )

    # Backfill: keep existing inventory_items.barcode_id discoverable via the new link table.
    op.execute(
        """
        INSERT INTO inventory_item_barcodes (inventory_item_id, barcode_id)
        SELECT id, barcode_id
        FROM inventory_items
        WHERE barcode_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inventory_item_barcodes_barcode_id"), table_name="inventory_item_barcodes")
    op.drop_index(
        op.f("ix_inventory_item_barcodes_inventory_item_id"), table_name="inventory_item_barcodes"
    )
    op.drop_table("inventory_item_barcodes")

    op.drop_column("barcodes", "zpl_barcode")
    op.drop_column("barcodes", "image_png")
    op.drop_column("barcodes", "image_filename")
    op.drop_column("barcodes", "title")
    op.alter_column(
        "barcodes",
        "value",
        existing_type=sa.String(length=128),
        nullable=False,
        existing_nullable=True,
    )

