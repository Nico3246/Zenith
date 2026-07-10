from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ExerciseDifficulty = Literal["beginner", "intermediate", "advanced"]


class NamedReference(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2_000)
    difficulty: ExerciseDifficulty | None = None
    technique_notes: str | None = Field(default=None, max_length=2_000)
    muscle_group_ids: list[UUID] = Field(default_factory=list)
    equipment_ids: list[UUID] = Field(default_factory=list)


class ExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    difficulty: str | None
    technique_notes: str | None
    is_global: bool
    created_by_user_id: UUID | None
    muscle_groups: list[NamedReference]
    equipment: list[NamedReference]
    created_at: datetime
    updated_at: datetime
