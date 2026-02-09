"""add inventory status enum

Revision ID: 9c1b3a4f7d2e
Revises: 8a2b6c1d9f3a
Create Date: 2026-02-08 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "9c1b3a4f7d2e"
down_revision = "8a2b6c1d9f3a"
branch_labels = None
depends_on = None


STATUS_VALUES = (
    "Новое",
    "В ремонте",
    "Отремонтировано",
    "Списано",
    "На складе",
    "Выдано",
)


def upgrade() -> None:
    status_enum = sa.Enum(*STATUS_VALUES, name="inventory_status")
    status_enum.create(op.get_bind(), checkfirst=True)

    allowed_list = ", ".join(f"'{value}'" for value in STATUS_VALUES)
    op.execute(
        f"""
        UPDATE inventory_items
        SET status = NULL
        WHERE status IS NOT NULL AND status NOT IN ({allowed_list})
        """
    )
    op.execute(
        """
        ALTER TABLE inventory_items
        ALTER COLUMN status TYPE inventory_status
        USING status::inventory_status
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE inventory_items
        ALTER COLUMN status TYPE VARCHAR(50)
        USING status::text
        """
    )
    status_enum = sa.Enum(*STATUS_VALUES, name="inventory_status")
    status_enum.drop(op.get_bind(), checkfirst=True)
