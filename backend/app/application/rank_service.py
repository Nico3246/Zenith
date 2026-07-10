from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.domain.ranks import UserRankRead
from app.infrastructure.db.models.rank import Rank
from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.ranks import RankRepository
from app.infrastructure.db.repositories.stats import StatsRepository, StatsRow

TWO_PLACES = Decimal("0.01")


@dataclass
class RankScore:
    score: Decimal
    volume_score: Decimal
    progression_score: Decimal
    breadth_score: Decimal


def quantize(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def estimated_1rm(row: StatsRow) -> Decimal | None:
    workout_set, _session, _exercise = row
    if workout_set.weight_value is None:
        return None
    weight = Decimal(workout_set.weight_value)
    return weight * (Decimal("1") + (Decimal(workout_set.reps) / Decimal("30")))


class RankService:
    def list_ranks(self, db: Session) -> list[Rank]:
        return RankRepository(db).list_ranks()

    def calculate_score(self, db: Session, user: User) -> RankScore:
        rows = StatsRepository(db).list_workout_sets(user_id=user.id)
        weighted_rows = [row for row in rows if row[0].weight_value is not None]

        volume_score = self._calculate_volume_score(weighted_rows)
        progression_score, breadth_score = self._calculate_progression_scores(weighted_rows)
        score = volume_score + progression_score + breadth_score

        return RankScore(
            score=quantize(score),
            volume_score=quantize(volume_score),
            progression_score=quantize(progression_score),
            breadth_score=quantize(breadth_score),
        )

    def get_current_rank(self, db: Session, user: User) -> UserRankRead:
        rank_repository = RankRepository(db)
        score = self.calculate_score(db, user)
        rank = rank_repository.get_rank_for_score(score.score)
        return self._build_rank_read(rank_repository, rank, score, calculated_at=None)

    def recalculate_rank(self, db: Session, user: User) -> UserRankRead:
        rank_repository = RankRepository(db)
        score = self.calculate_score(db, user)
        rank = rank_repository.get_rank_for_score(score.score)
        progress = rank_repository.save_progress(
            user_id=user.id,
            rank_id=rank.id,
            score=score.score,
            volume_score=score.volume_score,
            progression_score=score.progression_score,
            breadth_score=score.breadth_score,
        )
        return self._build_rank_read(rank_repository, rank, score, calculated_at=progress.calculated_at)

    def _build_rank_read(
        self,
        rank_repository: RankRepository,
        rank: Rank,
        score: RankScore,
        calculated_at,
    ) -> UserRankRead:
        next_rank = rank_repository.get_next_rank_for_score(score.score)
        points_to_next_rank = None
        if next_rank is not None:
            points_to_next_rank = quantize(Decimal(next_rank.min_score) - score.score)
        return UserRankRead(
            rank=rank,
            next_rank=next_rank,
            score=score.score,
            volume_score=score.volume_score,
            progression_score=score.progression_score,
            breadth_score=score.breadth_score,
            points_to_next_rank=points_to_next_rank,
            calculated_at=calculated_at,
        )

    def _calculate_volume_score(self, rows: list[StatsRow]) -> Decimal:
        total_volume = Decimal("0")
        for row in rows:
            workout_set, _session, _exercise = row
            total_volume += Decimal(workout_set.weight_value) * Decimal(workout_set.reps)
        return total_volume / Decimal("100")

    def _calculate_progression_scores(self, rows: list[StatsRow]) -> tuple[Decimal, Decimal]:
        grouped: dict[tuple[object, str], list[StatsRow]] = {}
        for row in rows:
            workout_set, _session, _exercise = row
            if workout_set.weight_unit is None:
                continue
            grouped.setdefault((workout_set.exercise_id, workout_set.weight_unit), []).append(row)

        progression_score = Decimal("0")
        progressed_groups = 0
        for group_rows in grouped.values():
            group_rows.sort(key=lambda row: (row[1].started_at, row[0].set_number))
            estimates = [value for row in group_rows if (value := estimated_1rm(row)) is not None]
            if not estimates or estimates[0] <= 0:
                continue
            first = estimates[0]
            best = max(estimates)
            if best <= first:
                continue

            improvement_percent = ((best - first) / first) * Decimal("100")
            progression_score += min(improvement_percent * Decimal("5"), Decimal("300"))
            progressed_groups += 1

        breadth_score = Decimal(progressed_groups) * Decimal("25")
        return progression_score, breadth_score


rank_service = RankService()
