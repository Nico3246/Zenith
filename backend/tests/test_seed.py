from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.db.base import Base
from app.infrastructure.db.models.exercise import Equipment, Exercise, MuscleGroup
from app.infrastructure.db.models.rank import Rank
from app.infrastructure.db.seed import seed_database
from app.infrastructure.db.seed_data import EQUIPMENT, EXERCISES, MUSCLE_GROUPS, RANKS


def test_seed_database_is_idempotent() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    db = session_local()

    try:
        seed_database(db)
        seed_database(db)

        assert len(db.scalars(select(MuscleGroup)).all()) == len(MUSCLE_GROUPS)
        assert len(db.scalars(select(Equipment)).all()) == len(EQUIPMENT)
        assert len(db.scalars(select(Exercise).where(Exercise.is_global.is_(True))).all()) == len(EXERCISES)
        assert len(db.scalars(select(Rank)).all()) == len(RANKS)
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
