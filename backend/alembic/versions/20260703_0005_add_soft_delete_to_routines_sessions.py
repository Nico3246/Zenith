"""add soft delete to routines and sessions

Revision ID: 20260703_0005
Revises: 20260702_0004
Create Date: 2026-07-03

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260703_0005"
down_revision: str | None = "20260702_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("routines", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("workout_sessions", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("workout_sessions", "deleted_at")
    op.drop_column("routines", "deleted_at")
