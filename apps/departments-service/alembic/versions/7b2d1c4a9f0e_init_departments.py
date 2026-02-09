"""init departments

Revision ID: 7b2d1c4a9f0e
Revises:
Create Date: 2026-02-08 22:20:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "7b2d1c4a9f0e"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=50),
            server_default=sa.text("'Активен'"),
            nullable=False,
        ),
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
    op.create_index(op.f("ix_departments_name"), "departments", ["name"], unique=False)
    op.create_index(
        op.f("ix_departments_location_id"),
        "departments",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_departments_location_id"), table_name="departments")
    op.drop_index(op.f("ix_departments_name"), table_name="departments")
    op.drop_table("departments")
