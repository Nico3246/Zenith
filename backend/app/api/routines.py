from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.users import get_current_user
from app.application.routine_service import RoutineReferenceError, routine_service
from app.domain.routines import RoutineCreate, RoutineRead, WorkoutSessionCreate, WorkoutSessionRead
from app.infrastructure.db.models.user import User
from app.infrastructure.db.session import get_db

router = APIRouter(tags=["routines"])


@router.post("/routines", response_model=RoutineRead, status_code=status.HTTP_201_CREATED)
def create_routine(
    data: RoutineCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        return routine_service.create_routine(db, data, current_user)
    except RoutineReferenceError as error:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {error}.",
        ) from error


@router.get("/routines", response_model=list[RoutineRead])
def list_routines(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return routine_service.list_routines(db, current_user)


@router.get("/routines/{routine_id}", response_model=RoutineRead)
def get_routine(
    routine_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    routine = routine_service.get_routine(db, routine_id, current_user)
    if routine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")
    return routine


@router.put("/routines/{routine_id}", response_model=RoutineRead)
def update_routine(
    routine_id: UUID,
    data: RoutineCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        routine = routine_service.update_routine(db, routine_id, data, current_user)
    except RoutineReferenceError as error:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {error}.",
        ) from error
    if routine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")
    return routine


@router.delete("/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(
    routine_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    deleted = routine_service.delete_routine(db, routine_id, current_user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")


@router.post("/workout-sessions", response_model=WorkoutSessionRead, status_code=status.HTTP_201_CREATED)
def create_workout_session(
    data: WorkoutSessionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        return routine_service.create_session(db, data, current_user)
    except RoutineReferenceError as error:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {error}.",
        ) from error


@router.get("/workout-sessions", response_model=list[WorkoutSessionRead])
def list_workout_sessions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return routine_service.list_sessions(db, current_user)


@router.get("/workout-sessions/{session_id}", response_model=WorkoutSessionRead)
def get_workout_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    session = routine_service.get_session(db, session_id, current_user)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout session not found.")
    return session


@router.put("/workout-sessions/{session_id}", response_model=WorkoutSessionRead)
def update_workout_session(
    session_id: UUID,
    data: WorkoutSessionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        session = routine_service.update_session(db, session_id, data, current_user)
    except RoutineReferenceError as error:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {error}.",
        ) from error
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout session not found.")
    return session


@router.delete("/workout-sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    deleted = routine_service.delete_session(db, session_id, current_user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout session not found.")
