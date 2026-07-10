"""create ai suggestions

Revision ID: 20260708_0007
Revises: 20260703_0006
Create Date: 2026-07-08

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260708_0007"
down_revision: str | None = "20260703_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("routine_exercises", sa.Column("target_weight_value", sa.Numeric(8, 2), nullable=True))
    op.add_column("routine_exercises", sa.Column("target_weight_unit", sa.String(length=2), nullable=True))
    op.create_check_constraint(
        "ck_routine_exercises_weight_non_negative",
        "routine_exercises",
        "target_weight_value IS NULL OR target_weight_value >= 0",
    )
    op.create_table(
        "ai_suggestions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("routine_id", sa.Uuid(), nullable=True),
        sa.Column("routine_exercise_id", sa.Uuid(), nullable=True),
        sa.Column("exercise_id", sa.Uuid(), nullable=True),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("input_summary", sa.JSON(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("apply_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
        sa.ForeignKeyConstraint(["routine_exercise_id"], ["routine_exercises.id"]),
        sa.ForeignKeyConstraint(["routine_id"], ["routines.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_suggestions_exercise_id"), "ai_suggestions", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_ai_suggestions_routine_exercise_id"), "ai_suggestions", ["routine_exercise_id"], unique=False)
    op.create_index(op.f("ix_ai_suggestions_routine_id"), "ai_suggestions", ["routine_id"], unique=False)
    op.create_index(op.f("ix_ai_suggestions_status"), "ai_suggestions", ["status"], unique=False)
    op.create_index(op.f("ix_ai_suggestions_user_id"), "ai_suggestions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_suggestions_user_id"), table_name="ai_suggestions")
    op.drop_index(op.f("ix_ai_suggestions_status"), table_name="ai_suggestions")
    op.drop_index(op.f("ix_ai_suggestions_routine_id"), table_name="ai_suggestions")
    op.drop_index(op.f("ix_ai_suggestions_routine_exercise_id"), table_name="ai_suggestions")
    op.drop_index(op.f("ix_ai_suggestions_exercise_id"), table_name="ai_suggestions")
    op.drop_table("ai_suggestions")
    op.drop_constraint("ck_routine_exercises_weight_non_negative", "routine_exercises", type_="check")
    op.drop_column("routine_exercises", "target_weight_unit")
    op.drop_column("routine_exercises", "target_weight_value")
