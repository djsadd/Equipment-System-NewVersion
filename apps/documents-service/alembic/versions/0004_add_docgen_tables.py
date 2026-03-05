"""add doc generation tables

Revision ID: 0004_add_docgen_tables
Revises: 0003_add_docx_templates
Create Date: 2026-02-20 00:00:10
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_add_docgen_tables"
down_revision = "0003_add_docx_templates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "docgen_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type_code", sa.String(length=64), nullable=False, index=True),
        sa.Column("version", sa.String(length=64), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, index=True),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("docx_blob", sa.LargeBinary(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_docgen_templates_type_code_status",
        "docgen_templates",
        ["type_code", "status"],
    )

    op.create_table(
        "docgen_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doc_number", sa.String(length=64), nullable=False, unique=True),
        sa.Column("type_code", sa.String(length=64), nullable=False, index=True),
        sa.Column(
            "template_id",
            sa.Integer(),
            sa.ForeignKey("docgen_templates.id"),
            nullable=False,
        ),
        sa.Column("template_version", sa.String(length=64), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("generated_by_user_id", sa.Integer(), nullable=False, index=True),
        sa.Column("status", sa.String(length=32), nullable=False, index=True),
        sa.Column("target_type", sa.String(length=32), nullable=False, index=True),
        sa.Column("target_id", sa.Integer(), nullable=False, index=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("docx_blob", sa.LargeBinary(), nullable=False),
        sa.Column("pdf_blob", sa.LargeBinary(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_docgen_documents_target",
        "docgen_documents",
        ["target_type", "target_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_docgen_documents_target", table_name="docgen_documents")
    op.drop_table("docgen_documents")
    op.drop_index("ix_docgen_templates_type_code_status", table_name="docgen_templates")
    op.drop_table("docgen_templates")

