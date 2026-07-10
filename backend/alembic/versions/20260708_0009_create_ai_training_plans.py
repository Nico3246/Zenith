"""create ai training plans

Revision ID: 20260708_0009
Revises: 20260708_0008
Create Date: 2026-07-08

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260708_0009"
down_revision: str | None = "20260708_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_training_plans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("goal", sa.String(length=40), nullable=False),
        sa.Column("level", sa.String(length=40), nullable=False),
        sa.Column("days_per_week", sa.Integer(), nullable=False),
        sa.Column("session_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("available_equipment", sa.JSON(), nullable=False),
        sa.Column("physical_limitations", sa.Text(), nullable=True),
        sa.Column("sensitive_data_acknowledged", sa.Boolean(), nullable=False),
        sa.Column("priorities", sa.JSON(), nullable=False),
        sa.Column("plan_payload", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("risk_notes", sa.Text(), nullable=True),
        sa.Column("confidence", sa.String(length=10), nullable=True),
        sa.Column("input_summary", sa.JSON(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("fallback_used", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_training_plans_status"), "ai_training_plans", ["status"], unique=False)
    op.create_index(op.f("ix_ai_training_plans_user_id"), "ai_training_plans", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_training_plans_user_id"), table_name="ai_training_plans")
    op.drop_index(op.f("ix_ai_training_plans_status"), table_name="ai_training_plans")
    op.drop_table("ai_training_plans")
