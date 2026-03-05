"""add docgen document metadata

Revision ID: 0005_docgen_doc_meta
Revises: 0004_add_docgen_tables
Create Date: 2026-02-24 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_docgen_doc_meta"
down_revision = "0004_add_docgen_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("docgen_documents", sa.Column("room_id", sa.Integer(), nullable=True))
    op.add_column(
        "docgen_documents", sa.Column("room_name", sa.String(length=128), nullable=True)
    )
    op.add_column(
        "docgen_documents",
        sa.Column("responsible_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "docgen_documents",
        sa.Column("responsible_user_name", sa.String(length=255), nullable=True),
    )
    op.add_column("docgen_documents", sa.Column("to_room_id", sa.Integer(), nullable=True))
    op.add_column(
        "docgen_documents", sa.Column("to_room_name", sa.String(length=128), nullable=True)
    )
    op.add_column(
        "docgen_documents",
        sa.Column("to_responsible_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "docgen_documents",
        sa.Column("to_responsible_user_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "docgen_documents",
        sa.Column("equipment_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "docgen_documents",
        sa.Column("inventory_number", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "docgen_documents", sa.Column("equipment_count", sa.Integer(), nullable=True)
    )
    op.add_column("docgen_documents", sa.Column("equipment_ids", sa.JSON(), nullable=True))
    op.add_column(
        "docgen_documents", sa.Column("equipment_list_text", sa.Text(), nullable=True)
    )
    op.add_column("docgen_documents", sa.Column("search_text", sa.Text(), nullable=True))

    op.create_index("ix_docgen_documents_room_id", "docgen_documents", ["room_id"])
    op.create_index(
        "ix_docgen_documents_responsible_user_id",
        "docgen_documents",
        ["responsible_user_id"],
    )
    op.create_index("ix_docgen_documents_to_room_id", "docgen_documents", ["to_room_id"])
    op.create_index(
        "ix_docgen_documents_to_responsible_user_id",
        "docgen_documents",
        ["to_responsible_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_docgen_documents_to_responsible_user_id", table_name="docgen_documents")
    op.drop_index("ix_docgen_documents_to_room_id", table_name="docgen_documents")
    op.drop_index("ix_docgen_documents_responsible_user_id", table_name="docgen_documents")
    op.drop_index("ix_docgen_documents_room_id", table_name="docgen_documents")

    op.drop_column("docgen_documents", "search_text")
    op.drop_column("docgen_documents", "equipment_list_text")
    op.drop_column("docgen_documents", "equipment_ids")
    op.drop_column("docgen_documents", "equipment_count")
    op.drop_column("docgen_documents", "inventory_number")
    op.drop_column("docgen_documents", "equipment_name")
    op.drop_column("docgen_documents", "to_responsible_user_name")
    op.drop_column("docgen_documents", "to_responsible_user_id")
    op.drop_column("docgen_documents", "to_room_name")
    op.drop_column("docgen_documents", "to_room_id")
    op.drop_column("docgen_documents", "responsible_user_name")
    op.drop_column("docgen_documents", "responsible_user_id")
    op.drop_column("docgen_documents", "room_name")
    op.drop_column("docgen_documents", "room_id")
