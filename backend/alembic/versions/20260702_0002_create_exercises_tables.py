"""create exercises tables

Revision ID: 20260702_0002
Revises: 20260702_0001
Create Date: 2026-07-02

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260702_0002"
down_revision: str | None = "20260702_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "equipment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_equipment_name"), "equipment", ["name"], unique=True)

    op.create_table(
        "muscle_groups",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_muscle_groups_name"), "muscle_groups", ["name"], unique=True)

    op.create_table(
        "exercises",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(length=30), nullable=True),
        sa.Column("technique_notes", sa.Text(), nullable=True),
        sa.Column("is_global", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_exercises_created_by_user_id"), "exercises", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_exercises_name"), "exercises", ["name"], unique=False)

    op.create_table(
        "exercise_equipment",
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("equipment_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["equipment_id"], ["equipment.id"]),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
        sa.PrimaryKeyConstraint("exercise_id", "equipment_id"),
    )
    op.create_table(
        "exercise_muscle_groups",
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("muscle_group_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
        sa.ForeignKeyConstraint(["muscle_group_id"], ["muscle_groups.id"]),
        sa.PrimaryKeyConstraint("exercise_id", "muscle_group_id"),
    )


def downgrade() -> None:
    op.drop_table("exercise_muscle_groups")
    op.drop_table("exercise_equipment")
    op.drop_index(op.f("ix_exercises_name"), table_name="exercises")
    op.drop_index(op.f("ix_exercises_created_by_user_id"), table_name="exercises")
    op.drop_table("exercises")
    op.drop_index(op.f("ix_muscle_groups_name"), table_name="muscle_groups")
    op.drop_table("muscle_groups")
    op.drop_index(op.f("ix_equipment_name"), table_name="equipment")
    op.drop_table("equipment")
