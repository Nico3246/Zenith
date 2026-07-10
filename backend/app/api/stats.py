from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.users import get_current_user
from app.application.stats_service import StatsNotFoundError, stats_service
from app.domain.stats import ExerciseStatsDetail, ExerciseStatsSummary, StatsPeriod, StatsWeightUnit
from app.infrastructure.db.models.user import User
from app.infrastructure.db.session import get_db

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/exercises", response_model=list[ExerciseStatsSummary])
def list_exercise_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: Annotated[datetime | None, Query()] = None,
    end_date: Annotated[datetime | None, Query()] = None,
    weight_unit: Annotated[StatsWeightUnit | None, Query()] = None,
):
    return stats_service.list_exercise_stats(db, current_user, start_date, end_date, weight_unit)


@router.get("/exercises/{exercise_id}", response_model=ExerciseStatsDetail)
def get_exercise_stats(
    exercise_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    period: Annotated[StatsPeriod, Query()] = "day",
    start_date: Annotated[datetime | None, Query()] = None,
    end_date: Annotated[datetime | None, Query()] = None,
    weight_unit: Annotated[StatsWeightUnit | None, Query()] = None,
):
    try:
        return stats_service.get_exercise_stats(
            db,
            current_user,
            exercise_id,
            period,
            start_date,
            end_date,
            weight_unit,
        )
    except StatsNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.") from error
