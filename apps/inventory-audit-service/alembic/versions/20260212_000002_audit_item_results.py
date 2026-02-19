"""audit item results

Revision ID: 20260212_000002
Revises: 20260212_000001
Create Date: 2026-02-12

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260212_000002"
down_revision = "20260212_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_item_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "missing",
                "found",
                "found_in_place",
                name="audit_item_result_status",
            ),
            nullable=False,
        ),
        sa.Column("expected_location_id", sa.Integer(), nullable=True),
        sa.Column("found_location_id", sa.Integer(), nullable=True),
        sa.Column("first_found_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_scan_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("session_id", "item_id", name="uq_result_session_item"),
    )
    op.create_index(op.f("ix_audit_item_results_session_id"), "audit_item_results", ["session_id"])
    op.create_index(op.f("ix_audit_item_results_item_id"), "audit_item_results", ["item_id"])
    op.create_index(op.f("ix_audit_item_results_status"), "audit_item_results", ["status"])
    op.create_index(op.f("ix_audit_item_results_created_at"), "audit_item_results", ["created_at"])
    op.create_index(op.f("ix_audit_item_results_updated_at"), "audit_item_results", ["updated_at"])


def downgrade() -> None:
    op.drop_table("audit_item_results")
    op.execute("DROP TYPE IF EXISTS audit_item_result_status")

