"""create platonus profiles

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-05 00:00:00.000000

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platonus_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("person_id", sa.String(length=50), nullable=False),
        sa.Column("primary_role", sa.String(length=50), nullable=False),
        sa.Column("roles", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("info", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_platonus_profiles_user_id"),
    )
    op.create_index("ix_platonus_profiles_user_id", "platonus_profiles", ["user_id"])
    op.create_index("ix_platonus_profiles_username", "platonus_profiles", ["username"])
    op.create_index("ix_platonus_profiles_person_id", "platonus_profiles", ["person_id"])


def downgrade() -> None:
    op.drop_index("ix_platonus_profiles_person_id", table_name="platonus_profiles")
    op.drop_index("ix_platonus_profiles_username", table_name="platonus_profiles")
    op.drop_index("ix_platonus_profiles_user_id", table_name="platonus_profiles")
    op.drop_table("platonus_profiles")

