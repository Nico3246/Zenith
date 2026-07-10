"""create routines and sessions tables

Revision ID: 20260702_0003
Revises: 20260702_0002
Create Date: 2026-07-02

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260702_0003"
down_revision: str | None = "20260702_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "routines",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("goal", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_routines_user_id"), "routines", ["user_id"], unique=False)

    op.create_table(
        "routine_exercises",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("routine_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("target_sets", sa.Integer(), nullable=True),
        sa.Column("target_reps_min", sa.Integer(), nullable=True),
        sa.Column("target_reps_max", sa.Integer(), nullable=True),
        sa.Column("target_rpe", sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column("target_rir", sa.Integer(), nullable=True),
        sa.Column("rest_seconds", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.CheckConstraint("position >= 1", name="ck_routine_exercises_position_positive"),
        sa.CheckConstraint("target_sets IS NULL OR target_sets >= 1", name="ck_routine_exercises_sets_positive"),
        sa.CheckConstraint(
            "target_reps_min IS NULL OR target_reps_min >= 0",
            name="ck_routine_exercises_reps_min_non_negative",
        ),
        sa.CheckConstraint(
            "target_reps_max IS NULL OR target_reps_max >= 0",
            name="ck_routine_exercises_reps_max_non_negative",
        ),
        sa.CheckConstraint(
            "target_rpe IS NULL OR (target_rpe >= 1 AND target_rpe <= 10)",
            name="ck_routine_exercises_rpe_range",
        ),
        sa.CheckConstraint(
            "target_rir IS NULL OR target_rir >= 0",
            name="ck_routine_exercises_rir_non_negative",
        ),
        sa.CheckConstraint(
            "rest_seconds IS NULL OR rest_seconds >= 0",
            name="ck_routine_exercises_rest_non_negative",
        ),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
        sa.ForeignKeyConstraint(["routine_id"], ["routines.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_routine_exercises_exercise_id"), "routine_exercises", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_routine_exercises_routine_id"), "routine_exercises", ["routine_id"], unique=False)

    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("routine_id", sa.Uuid(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timezone", sa.String(length=80), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["routine_id"], ["routines.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workout_sessions_routine_id"), "workout_sessions", ["routine_id"], unique=False)
    op.create_index(op.f("ix_workout_sessions_user_id"), "workout_sessions", ["user_id"], unique=False)

    op.create_table(
        "workout_sets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("weight_value", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("weight_unit", sa.String(length=2), nullable=True),
        sa.Column("rpe", sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column("rir", sa.Integer(), nullable=True),
        sa.Column("rest_seconds", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.CheckConstraint("set_number >= 1", name="ck_workout_sets_number_positive"),
        sa.CheckConstraint("reps >= 0", name="ck_workout_sets_reps_non_negative"),
        sa.CheckConstraint("weight_value IS NULL OR weight_value >= 0", name="ck_workout_sets_weight_non_negative"),
        sa.CheckConstraint("rpe IS NULL OR (rpe >= 1 AND rpe <= 10)", name="ck_workout_sets_rpe_range"),
        sa.CheckConstraint("rir IS NULL OR rir >= 0", name="ck_workout_sets_rir_non_negative"),
        sa.CheckConstraint("rest_seconds IS NULL OR rest_seconds >= 0", name="ck_workout_sets_rest_non_negative"),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["workout_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workout_sets_exercise_id"), "workout_sets", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_workout_sets_session_id"), "workout_sets", ["session_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_workout_sets_session_id"), table_name="workout_sets")
    op.drop_index(op.f("ix_workout_sets_exercise_id"), table_name="workout_sets")
    op.drop_table("workout_sets")
    op.drop_index(op.f("ix_workout_sessions_user_id"), table_name="workout_sessions")
    op.drop_index(op.f("ix_workout_sessions_routine_id"), table_name="workout_sessions")
    op.drop_table("workout_sessions")
    op.drop_index(op.f("ix_routine_exercises_routine_id"), table_name="routine_exercises")
    op.drop_index(op.f("ix_routine_exercises_exercise_id"), table_name="routine_exercises")
    op.drop_table("routine_exercises")
    op.drop_index(op.f("ix_routines_user_id"), table_name="routines")
    op.drop_table("routines")
