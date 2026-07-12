from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

StatsPeriod = Literal["day", "week", "month"]
StatsWeightUnit = Literal["kg", "lb"]


class ExerciseStatsSummary(BaseModel):
    exercise_id: UUID
    exercise_name: str
    weight_unit: str | None
    total_sets: int
    total_reps: int
    total_volume: Decimal | None
    max_weight: Decimal | None
    avg_weight: Decimal | None
    best_estimated_1rm: Decimal | None
    first_session_at: datetime | None
    last_session_at: datetime | None


class ExerciseStatsPoint(BaseModel):
    period_start: datetime
    weight_unit: str | None
    total_sets: int
    total_reps: int
    total_volume: Decimal | None
    max_weight: Decimal | None
    avg_weight: Decimal | None
    best_estimated_1rm: Decimal | None


class ExerciseStatsDetail(BaseModel):
    exercise_id: UUID
    exercise_name: str
    period: StatsPeriod
    points: list[ExerciseStatsPoint]


class StatsVolumeByUnit(BaseModel):
    weight_unit: str | None
    total_volume: Decimal | None


class StatsOverviewKpis(BaseModel):
    total_sets: int
    session_count: int
    training_hours: Decimal
    pr_count: int


class StatsOverviewPoint(BaseModel):
    period_start: datetime
    weight_unit: str | None
    total_volume: Decimal | None
    total_sets: int
    session_count: int


class StatsMuscleGroupSummary(BaseModel):
    name: str
    total_sets: int


class StatsTopExerciseSummary(BaseModel):
    exercise_id: UUID
    exercise_name: str
    weight_unit: str | None
    total_volume: Decimal | None
    max_weight: Decimal | None
    best_estimated_1rm: Decimal | None


class StatsOverview(BaseModel):
    period: StatsPeriod
    kpis: StatsOverviewKpis
    volume_by_unit: list[StatsVolumeByUnit]
    volume_points: list[StatsOverviewPoint]
    muscle_groups: list[StatsMuscleGroupSummary]
    top_exercises: list[StatsTopExerciseSummary]
