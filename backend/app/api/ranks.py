from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.users import get_current_user
from app.application.rank_service import rank_service
from app.domain.ranks import RankRead, UserRankRead
from app.infrastructure.db.models.user import User
from app.infrastructure.db.session import get_db

router = APIRouter(tags=["ranks"])


@router.get("/ranks", response_model=list[RankRead])
def list_ranks(db: Annotated[Session, Depends(get_db)]):
    return rank_service.list_ranks(db)


@router.get("/users/me/rank", response_model=UserRankRead)
def get_my_rank(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return rank_service.get_current_rank(db, current_user)


@router.post("/users/me/rank/recalculate", response_model=UserRankRead)
def recalculate_my_rank(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return rank_service.recalculate_rank(db, current_user)
