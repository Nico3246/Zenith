from collections.abc import Callable, Generator
from datetime import UTC, datetime
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.infrastructure.db.base import Base
from app.infrastructure.db.models.exercise import Exercise
from app.infrastructure.db.models.routine import Routine
from app.infrastructure.db.models.workout import WorkoutSession
from app.infrastructure.db.session import get_db
from app.main import app

SessionFactory = Callable[[], Session]


@pytest.fixture()
def client_with_db() -> Generator[tuple[TestClient, SessionFactory], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client, testing_session_local
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


def register_and_login(client: TestClient, email: str, username: str) -> str:
    password = "password123"
    client.post("/auth/register", json={"email": email, "username": username, "password": password})
    response = client.post("/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def seed_global_exercise(session_factory: SessionFactory, name: str = "Bench press") -> Exercise:
    db = session_factory()
    try:
        exercise = Exercise(name=name, difficulty="beginner", is_global=True)
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        return exercise
    finally:
        db.close()


def create_routine(client: TestClient, token: str, exercise_id: str) -> dict:
    response = client.post(
        "/routines",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Strength plan",
            "goal": "Strength",
            "description": "private routine description",
            "exercises": [
                {
                    "exercise_id": exercise_id,
                    "position": 1,
                    "target_sets": 3,
                    "target_reps_min": 6,
                    "target_reps_max": 8,
                    "target_rpe": "8",
                    "target_rir": 2,
                    "rest_seconds": 180,
                    "notes": "private routine note",
                }
            ],
        },
    )
    assert response.status_code == 201
    return response.json()


def create_session(client: TestClient, token: str, routine_id: str, exercise_id: str) -> dict:
    response = client.post(
        "/workout-sessions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "routine_id": routine_id,
            "started_at": datetime(2026, 7, 9, 10, 0, tzinfo=UTC).isoformat(),
            "timezone": "Europe/Madrid",
            "notes": "private session note",
            "sets": [
                {
                    "exercise_id": exercise_id,
                    "set_number": 1,
                    "reps": 8,
                    "weight_value": "50",
                    "weight_unit": "kg",
                    "rpe": "9",
                    "rir": 1,
                    "rest_seconds": 180,
                    "notes": "private set note",
                },
                {
                    "exercise_id": exercise_id,
                    "set_number": 2,
                    "reps": 7,
                    "weight_value": "50",
                    "weight_unit": "kg",
                    "rpe": "9",
                    "rir": 1,
                    "rest_seconds": 180,
                },
            ],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_ask_coach_question_returns_guided_answer_without_persisting_or_leaking_notes(
    client_with_db: tuple[TestClient, SessionFactory],
) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    routine = create_routine(client, token, str(exercise.id))
    create_session(client, token, routine["id"], str(exercise.id))

    response = client.post(
        "/ai/coach/questions",
        headers={"Authorization": f"Bearer {token}"},
        json={"question_type": "next_workout", "routine_id": routine["id"], "detail": "private free detail"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["question_type"] == "next_workout"
    assert data["provider"] == "internal"
    assert data["fallback_used"] is False
    assert data["related_metrics"]["recent_session_count"] == 1
    assert data["input_summary"]["privacy"] == {
        "notes_included": False,
        "email_included": False,
        "username_included": False,
        "tokens_included": False,
        "detail_text_included": False,
    }
    serialized = json.dumps(data)
    assert "private routine note" not in serialized
    assert "private session note" not in serialized
    assert "private set note" not in serialized
    assert "private free detail" not in serialized
    assert "owner@example.com" not in serialized

    db = session_factory()
    try:
        assert db.scalar(select(func.count()).select_from(Routine)) == 1
        assert db.scalar(select(func.count()).select_from(WorkoutSession)) == 1
    finally:
        db.close()


def test_routine_review_requires_own_routine(client_with_db: tuple[TestClient, SessionFactory]) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    owner_token = register_and_login(client, "owner@example.com", "owner_user")
    other_token = register_and_login(client, "other@example.com", "other_user")
    routine = create_routine(client, owner_token, str(exercise.id))

    missing_context = client.post(
        "/ai/coach/questions",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"question_type": "routine_review"},
    )
    other_user = client.post(
        "/ai/coach/questions",
        headers={"Authorization": f"Bearer {other_token}"},
        json={"question_type": "routine_review", "routine_id": routine["id"]},
    )

    assert missing_context.status_code == 422
    assert other_user.status_code == 404


def test_ollama_enriches_coach_question_without_detail_text(
    client_with_db: tuple[TestClient, SessionFactory], monkeypatch
) -> None:
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _traceback):
            return False

        def read(self):
            return (
                b'{"response": "{\\"answer\\": \\"Respuesta Ollama\\", '
                b'\\"key_points\\": [\\"Punto Ollama\\"], '
                b'\\"suggested_actions\\": [\\"Accion Ollama\\"]}"}'
            )

    captured_body = {}

    def fake_urlopen(request, timeout):
        captured_body["body"] = request.data.decode("utf-8")
        return FakeResponse()

    monkeypatch.setenv("APP_AI_PROVIDER", "ollama")
    get_settings.cache_clear()
    monkeypatch.setattr("app.application.ai_provider.urlopen", fake_urlopen)
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    routine = create_routine(client, token, str(exercise.id))

    response = client.post(
        "/ai/coach/questions",
        headers={"Authorization": f"Bearer {token}"},
        json={"question_type": "progression", "routine_id": routine["id"], "detail": "no enviar este detalle"},
    )

    get_settings.cache_clear()
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "Respuesta Ollama"
    assert data["key_points"] == ["Punto Ollama"]
    assert data["suggested_actions"] == ["Accion Ollama"]
    assert data["provider"] == "ollama"
    assert data["fallback_used"] is False
    assert "no enviar este detalle" not in captured_body["body"]


def test_ollama_invalid_response_falls_back_to_internal_answer(
    client_with_db: tuple[TestClient, SessionFactory], monkeypatch
) -> None:
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _traceback):
            return False

        def read(self):
            return b'{"response": "not-json"}'

    monkeypatch.setenv("APP_AI_PROVIDER", "ollama")
    get_settings.cache_clear()
    monkeypatch.setattr("app.application.ai_provider.urlopen", lambda request, timeout: FakeResponse())
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    routine = create_routine(client, token, str(exercise.id))

    response = client.post(
        "/ai/coach/questions",
        headers={"Authorization": f"Bearer {token}"},
        json={"question_type": "fatigue", "routine_id": routine["id"]},
    )

    get_settings.cache_clear()
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "ollama"
    assert data["fallback_used"] is True
    assert data["answer"]
