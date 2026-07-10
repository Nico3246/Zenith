"""create ai session summaries

Revision ID: 20260708_0010
Revises: 20260708_0009
Create Date: 2026-07-08

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260708_0010"
down_revision: str | None = "20260708_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_session_summaries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("improvements", sa.JSON(), nullable=False),
        sa.Column("drops", sa.JSON(), nullable=False),
        sa.Column("warnings", sa.JSON(), nullable=False),
        sa.Column("next_recommendation", sa.Text(), nullable=False),
        sa.Column("input_summary", sa.JSON(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("fallback_used", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["workout_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", name="uq_ai_session_summaries_session_id"),
    )
    op.create_index(op.f("ix_ai_session_summaries_session_id"), "ai_session_summaries", ["session_id"], unique=False)
    op.create_index(op.f("ix_ai_session_summaries_user_id"), "ai_session_summaries", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_session_summaries_user_id"), table_name="ai_session_summaries")
    op.drop_index(op.f("ix_ai_session_summaries_session_id"), table_name="ai_session_summaries")
    op.drop_table("ai_session_summaries")
