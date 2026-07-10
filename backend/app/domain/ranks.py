from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RankRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    min_score: Decimal
    sort_order: int


class UserRankRead(BaseModel):
    rank: RankRead
    next_rank: RankRead | None
    score: Decimal
    volume_score: Decimal
    progression_score: Decimal
    breadth_score: Decimal
    points_to_next_rank: Decimal | None
    calculated_at: datetime | None
