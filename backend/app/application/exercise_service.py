from uuid import UUID

from sqlalchemy.orm import Session

from app.domain.exercises import ExerciseCreate
from app.infrastructure.db.models.exercise import Equipment, Exercise, MuscleGroup
from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.exercises import ExerciseRepository


class ExerciseReferenceError(Exception):
    pass


class ExerciseService:
    def list_exercises(self, db: Session, user: User | None) -> list[Exercise]:
        return ExerciseRepository(db).list_accessible(user.id if user else None)

    def get_exercise(self, db: Session, exercise_id: UUID, user: User | None) -> Exercise | None:
        return ExerciseRepository(db).get_accessible(exercise_id, user.id if user else None)

    def create_user_exercise(self, db: Session, data: ExerciseCreate, user: User) -> Exercise:
        repository = ExerciseRepository(db)
        muscle_groups = repository.get_muscle_groups_by_ids(data.muscle_group_ids)
        equipment = repository.get_equipment_by_ids(data.equipment_ids)

        if len(muscle_groups) != len(set(data.muscle_group_ids)):
            raise ExerciseReferenceError("muscle_group_ids")
        if len(equipment) != len(set(data.equipment_ids)):
            raise ExerciseReferenceError("equipment_ids")

        return repository.create_user_exercise(
            name=data.name,
            description=data.description,
            difficulty=data.difficulty,
            technique_notes=data.technique_notes,
            created_by_user_id=user.id,
            muscle_groups=muscle_groups,
            equipment=equipment,
        )

    def list_muscle_groups(self, db: Session) -> list[MuscleGroup]:
        return ExerciseRepository(db).list_muscle_groups()

    def list_equipment(self, db: Session) -> list[Equipment]:
        return ExerciseRepository(db).list_equipment()


exercise_service = ExerciseService()
