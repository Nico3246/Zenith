from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy.orm import Session

from app.domain.stats import ExerciseStatsDetail, ExerciseStatsPoint, ExerciseStatsSummary, StatsPeriod
from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.exercises import ExerciseRepository
from app.infrastructure.db.repositories.stats import StatsRepository, StatsRow

TWO_PLACES = Decimal("0.01")


class StatsNotFoundError(Exception):
    pass


@dataclass
class StatsAccumulator:
    exercise_id: UUID
    exercise_name: str
    weight_unit: str | None
    total_sets: int = 0
    total_reps: int = 0
    weighted_sets: int = 0
    weight_sum: Decimal = Decimal("0")
    total_volume: Decimal = Decimal("0")
    max_weight: Decimal | None = None
    best_estimated_1rm: Decimal | None = None
    first_session_at: datetime | None = None
    last_session_at: datetime | None = None

    def add(self, row: StatsRow) -> None:
        workout_set, session, _exercise = row
        started_at = ensure_utc(session.started_at)
        self.total_sets += 1
        self.total_reps += workout_set.reps
        self.first_session_at = started_at if self.first_session_at is None else min(self.first_session_at, started_at)
        self.last_session_at = started_at if self.last_session_at is None else max(self.last_session_at, started_at)

        if workout_set.weight_value is None:
            return

        weight = Decimal(workout_set.weight_value)
        self.weighted_sets += 1
        self.weight_sum += weight
        self.total_volume += weight * workout_set.reps
        self.max_weight = weight if self.max_weight is None else max(self.max_weight, weight)
        estimated_1rm = weight * (Decimal("1") + (Decimal(workout_set.reps) / Decimal("30")))
        self.best_estimated_1rm = (
            estimated_1rm if self.best_estimated_1rm is None else max(self.best_estimated_1rm, estimated_1rm)
        )

    def to_summary(self) -> ExerciseStatsSummary:
        return ExerciseStatsSummary(
            exercise_id=self.exercise_id,
            exercise_name=self.exercise_name,
            weight_unit=self.weight_unit,
            total_sets=self.total_sets,
            total_reps=self.total_reps,
            total_volume=quantize_or_none(self.total_volume if self.weighted_sets else None),
            max_weight=quantize_or_none(self.max_weight),
            avg_weight=quantize_or_none(self.weight_sum / self.weighted_sets if self.weighted_sets else None),
            best_estimated_1rm=quantize_or_none(self.best_estimated_1rm),
            first_session_at=self.first_session_at,
            last_session_at=self.last_session_at,
        )

    def to_point(self, period_start: datetime) -> ExerciseStatsPoint:
        return ExerciseStatsPoint(
            period_start=period_start,
            weight_unit=self.weight_unit,
            total_sets=self.total_sets,
            total_reps=self.total_reps,
            total_volume=quantize_or_none(self.total_volume if self.weighted_sets else None),
            max_weight=quantize_or_none(self.max_weight),
            avg_weight=quantize_or_none(self.weight_sum / self.weighted_sets if self.weighted_sets else None),
            best_estimated_1rm=quantize_or_none(self.best_estimated_1rm),
        )


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def quantize_or_none(value: Decimal | None) -> Decimal | None:
    if value is None:
        return None
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def period_start_for(value: datetime, period: StatsPeriod) -> datetime:
    value = ensure_utc(value)
    if period == "day":
        return value.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "week":
        start = value.replace(hour=0, minute=0, second=0, microsecond=0)
        return start - timedelta(days=start.weekday())
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def row_weight_unit(row: StatsRow) -> str | None:
    workout_set, _session, _exercise = row
    return workout_set.weight_unit if workout_set.weight_value is not None else None


class StatsService:
    def list_exercise_stats(
        self,
        db: Session,
        user: User,
        start_date: datetime | None,
        end_date: datetime | None,
        weight_unit: str | None,
    ) -> list[ExerciseStatsSummary]:
        rows = StatsRepository(db).list_workout_sets(
            user_id=user.id,
            start_date=start_date,
            end_date=end_date,
        )
        rows = filter_rows_by_weight_unit(rows, weight_unit)
        groups: dict[tuple[UUID, str | None], StatsAccumulator] = {}
        for row in rows:
            workout_set, _session, exercise = row
            unit = row_weight_unit(row)
            key = (workout_set.exercise_id, unit)
            groups.setdefault(
                key,
                StatsAccumulator(
                    exercise_id=workout_set.exercise_id,
                    exercise_name=exercise.name,
                    weight_unit=unit,
                ),
            ).add(row)

        return sorted(
            (group.to_summary() for group in groups.values()),
            key=lambda item: (item.exercise_name, item.weight_unit or ""),
        )

    def get_exercise_stats(
        self,
        db: Session,
        user: User,
        exercise_id: UUID,
        period: StatsPeriod,
        start_date: datetime | None,
        end_date: datetime | None,
        weight_unit: str | None,
    ) -> ExerciseStatsDetail:
        exercise = ExerciseRepository(db).get_accessible(exercise_id, user.id)
        if exercise is None:
            raise StatsNotFoundError

        rows = StatsRepository(db).list_workout_sets(
            user_id=user.id,
            exercise_id=exercise_id,
            start_date=start_date,
            end_date=end_date,
        )
        rows = filter_rows_by_weight_unit(rows, weight_unit)
        groups: dict[tuple[datetime, str | None], StatsAccumulator] = {}
        for row in rows:
            workout_set, session, _exercise = row
            unit = row_weight_unit(row)
            period_start = period_start_for(session.started_at, period)
            key = (period_start, unit)
            groups.setdefault(
                key,
                StatsAccumulator(
                    exercise_id=workout_set.exercise_id,
                    exercise_name=exercise.name,
                    weight_unit=unit,
                ),
            ).add(row)

        points = [group.to_point(period_start) for (period_start, _unit), group in groups.items()]
        points.sort(key=lambda item: (item.period_start, item.weight_unit or ""))
        return ExerciseStatsDetail(exercise_id=exercise.id, exercise_name=exercise.name, period=period, points=points)


def filter_rows_by_weight_unit(rows: list[StatsRow], weight_unit: str | None) -> list[StatsRow]:
    if weight_unit is None:
        return rows
    return [row for row in rows if row_weight_unit(row) == weight_unit]


stats_service = StatsService()
