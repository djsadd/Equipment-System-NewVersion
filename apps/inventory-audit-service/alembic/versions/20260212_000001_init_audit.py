"""init audit

Revision ID: 20260212_000001
Revises:
Create Date: 2026-02-12

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260212_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "scope_type",
            sa.Enum("location", "department", "custom", name="audit_scope_type"),
            nullable=False,
        ),
        sa.Column(
            "scope_payload",
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql"),
            nullable=False,
        ),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "scheduled", "active", "closed", "canceled", name="audit_plan_status"),
            nullable=False,
        ),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_audit_plans_status"), "audit_plans", ["status"])
    op.create_index(op.f("ix_audit_plans_created_by"), "audit_plans", ["created_by"])
    op.create_index(op.f("ix_audit_plans_created_at"), "audit_plans", ["created_at"])
    op.create_index(op.f("ix_audit_plans_updated_at"), "audit_plans", ["updated_at"])

    op.create_table(
        "audit_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plan_id", sa.Integer(), nullable=True),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "draft",
                "in_progress",
                "reconciling",
                "awaiting_approval",
                "approved",
                "applied",
                "closed",
                "canceled",
                name="audit_session_status",
            ),
            nullable=False,
        ),
        sa.Column("started_by", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_by", sa.Integer(), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expected_snapshot_version", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_audit_sessions_plan_id"), "audit_sessions", ["plan_id"])
    op.create_index(op.f("ix_audit_sessions_location_id"), "audit_sessions", ["location_id"])
    op.create_index(op.f("ix_audit_sessions_status"), "audit_sessions", ["status"])
    op.create_index(op.f("ix_audit_sessions_started_by"), "audit_sessions", ["started_by"])
    op.create_index(op.f("ix_audit_sessions_closed_by"), "audit_sessions", ["closed_by"])
    op.create_index(op.f("ix_audit_sessions_approved_by"), "audit_sessions", ["approved_by"])
    op.create_index(op.f("ix_audit_sessions_created_at"), "audit_sessions", ["created_at"])
    op.create_index(op.f("ix_audit_sessions_updated_at"), "audit_sessions", ["updated_at"])

    op.create_table(
        "audit_expected_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("expected_location_id", sa.Integer(), nullable=True),
        sa.Column("expected_responsible_id", sa.Integer(), nullable=True),
        sa.Column("barcode_id", sa.Integer(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("session_id", "item_id", name="uq_expected_session_item"),
    )
    op.create_index(op.f("ix_audit_expected_items_session_id"), "audit_expected_items", ["session_id"])
    op.create_index(op.f("ix_audit_expected_items_item_id"), "audit_expected_items", ["item_id"])
    op.create_index(op.f("ix_audit_expected_items_expected_location_id"), "audit_expected_items", ["expected_location_id"])
    op.create_index(
        op.f("ix_audit_expected_items_expected_responsible_id"),
        "audit_expected_items",
        ["expected_responsible_id"],
    )
    op.create_index(op.f("ix_audit_expected_items_barcode_id"), "audit_expected_items", ["barcode_id"])
    op.create_index(op.f("ix_audit_expected_items_captured_at"), "audit_expected_items", ["captured_at"])

    op.create_table(
        "audit_scans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("scanner_user_id", sa.Integer(), nullable=False),
        sa.Column("scan_time", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("barcode_value", sa.String(length=128), nullable=True),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("found_location_id", sa.Integer(), nullable=False),
        sa.Column("notes", sa.String(length=5000), nullable=True),
        sa.Column("photo_url", sa.String(length=2048), nullable=True),
        sa.Column("client_scan_id", sa.String(length=64), nullable=False),
        sa.Column(
            "extra",
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql"),
            nullable=True,
        ),
        sa.UniqueConstraint("session_id", "client_scan_id", name="uq_scan_session_client_id"),
    )
    op.create_index(op.f("ix_audit_scans_session_id"), "audit_scans", ["session_id"])
    op.create_index(op.f("ix_audit_scans_scanner_user_id"), "audit_scans", ["scanner_user_id"])
    op.create_index(op.f("ix_audit_scans_scan_time"), "audit_scans", ["scan_time"])
    op.create_index(op.f("ix_audit_scans_barcode_value"), "audit_scans", ["barcode_value"])
    op.create_index(op.f("ix_audit_scans_item_id"), "audit_scans", ["item_id"])
    op.create_index(op.f("ix_audit_scans_found_location_id"), "audit_scans", ["found_location_id"])

    op.create_table(
        "audit_discrepancies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "missing",
                "misplaced",
                "unexpected",
                "duplicate",
                "unknown_barcode",
                name="audit_discrepancy_type",
            ),
            nullable=False,
        ),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("barcode_value", sa.String(length=128), nullable=True),
        sa.Column("expected_location_id", sa.Integer(), nullable=True),
        sa.Column("found_location_id", sa.Integer(), nullable=True),
        sa.Column(
            "resolution_status",
            sa.Enum("open", "resolved", "ignored", name="audit_resolution_status"),
            nullable=False,
        ),
        sa.Column(
            "resolution_payload",
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_audit_discrepancies_session_id"), "audit_discrepancies", ["session_id"])
    op.create_index(op.f("ix_audit_discrepancies_type"), "audit_discrepancies", ["type"])
    op.create_index(op.f("ix_audit_discrepancies_item_id"), "audit_discrepancies", ["item_id"])
    op.create_index(op.f("ix_audit_discrepancies_barcode_value"), "audit_discrepancies", ["barcode_value"])
    op.create_index(
        op.f("ix_audit_discrepancies_resolution_status"),
        "audit_discrepancies",
        ["resolution_status"],
    )
    op.create_index(op.f("ix_audit_discrepancies_created_at"), "audit_discrepancies", ["created_at"])
    op.create_index(op.f("ix_audit_discrepancies_updated_at"), "audit_discrepancies", ["updated_at"])

    op.create_table(
        "audit_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column(
            "action_type",
            sa.Enum(
                "move",
                "assign_responsible",
                "clear_responsible",
                name="audit_action_type",
            ),
            nullable=False,
        ),
        sa.Column(
            "payload",
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "sent", "done", "failed", name="audit_action_status"),
            nullable=False,
        ),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("last_error", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("idempotency_key", name="uq_action_idempotency_key"),
    )
    op.create_index(op.f("ix_audit_actions_session_id"), "audit_actions", ["session_id"])
    op.create_index(op.f("ix_audit_actions_action_type"), "audit_actions", ["action_type"])
    op.create_index(op.f("ix_audit_actions_status"), "audit_actions", ["status"])


def downgrade() -> None:
    op.drop_table("audit_actions")
    op.drop_table("audit_discrepancies")
    op.drop_table("audit_scans")
    op.drop_table("audit_expected_items")
    op.drop_table("audit_sessions")
    op.drop_table("audit_plans")

    op.execute("DROP TYPE IF EXISTS audit_action_status")
    op.execute("DROP TYPE IF EXISTS audit_action_type")
    op.execute("DROP TYPE IF EXISTS audit_resolution_status")
    op.execute("DROP TYPE IF EXISTS audit_discrepancy_type")
    op.execute("DROP TYPE IF EXISTS audit_session_status")
    op.execute("DROP TYPE IF EXISTS audit_plan_status")
    op.execute("DROP TYPE IF EXISTS audit_scope_type")

