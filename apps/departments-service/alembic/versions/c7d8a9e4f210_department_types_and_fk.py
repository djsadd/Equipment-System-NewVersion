"""department_types and FK from departments

Revision ID: c7d8a9e4f210
Revises: b1a4d9a1c2f3
Create Date: 2026-03-10 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "c7d8a9e4f210"
down_revision = "b1a4d9a1c2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "department_types",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
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
    op.create_index(op.f("ix_department_types_name"), "department_types", ["name"], unique=True)

    op.add_column("departments", sa.Column("department_type_id", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_departments_department_type_id"),
        "departments",
        ["department_type_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_departments_department_type_id_department_types"),
        "departments",
        "department_types",
        ["department_type_id"],
        ["id"],
        ondelete="SET NULL",
    )

    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT DISTINCT department_type FROM departments "
            "WHERE department_type IS NOT NULL AND trim(department_type) <> ''"
        )
    ).fetchall()
    for (name,) in rows:
        result = bind.execute(
            sa.text(
                "INSERT INTO department_types (name, status, created_at, updated_at) "
                "VALUES (:name, 'Активен', now(), now()) "
                "ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name "
                "RETURNING id"
            ),
            {"name": name},
        ).fetchone()
        type_id = int(result[0])
        bind.execute(
            sa.text(
                "UPDATE departments SET department_type_id = :type_id "
                "WHERE department_type = :name"
            ),
            {"type_id": type_id, "name": name},
        )

    op.drop_column("departments", "department_type")


def downgrade() -> None:
    op.add_column("departments", sa.Column("department_type", sa.String(length=100), nullable=True))

    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE departments d SET department_type = t.name "
            "FROM department_types t WHERE d.department_type_id = t.id"
        )
    )

    op.drop_constraint(
        op.f("fk_departments_department_type_id_department_types"),
        "departments",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_departments_department_type_id"), table_name="departments")
    op.drop_column("departments", "department_type_id")

    op.drop_index(op.f("ix_department_types_name"), table_name="department_types")
    op.drop_table("department_types")

