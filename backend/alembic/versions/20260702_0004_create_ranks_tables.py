"""create ranks tables

Revision ID: 20260702_0004
Revises: 20260702_0003
Create Date: 2026-07-02

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260702_0004"
down_revision: str | None = "20260702_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ranks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("min_score", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("sort_order"),
    )
    op.create_table(
        "user_rank_progress",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("rank_id", sa.Uuid(), nullable=False),
        sa.Column("score", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("volume_score", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("progression_score", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("breadth_score", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["rank_id"], ["ranks.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_rank_progress_rank_id"), "user_rank_progress", ["rank_id"], unique=False)
    op.create_index(op.f("ix_user_rank_progress_user_id"), "user_rank_progress", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_rank_progress_user_id"), table_name="user_rank_progress")
    op.drop_index(op.f("ix_user_rank_progress_rank_id"), table_name="user_rank_progress")
    op.drop_table("user_rank_progress")
    op.drop_table("ranks")
