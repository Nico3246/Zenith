from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.db.models.ai import AiSessionSummary


class AiSessionSummaryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_session(self, session_id: UUID, user_id: UUID) -> AiSessionSummary | None:
        statement = select(AiSessionSummary).where(
            AiSessionSummary.session_id == session_id,
            AiSessionSummary.user_id == user_id,
        )
        return self.db.scalar(statement)

    def upsert(
        self,
        *,
        user_id: UUID,
        session_id: UUID,
        summary: str,
        improvements: list[str],
        drops: list[str],
        warnings: list[str],
        next_recommendation: str,
        input_summary: dict,
        provider: str,
        model: str | None,
        fallback_used: bool,
    ) -> AiSessionSummary:
        existing = self.get_by_session(session_id, user_id)
        if existing is None:
            existing = AiSessionSummary(user_id=user_id, session_id=session_id)
            self.db.add(existing)
        existing.summary = summary
        existing.improvements = improvements
        existing.drops = drops
        existing.warnings = warnings
        existing.next_recommendation = next_recommendation
        existing.input_summary = input_summary
        existing.provider = provider
        existing.model = model
        existing.fallback_used = fallback_used
        self.db.flush()
        return existing
