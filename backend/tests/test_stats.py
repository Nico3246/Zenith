from collections.abc import Callable, Generator
from datetime import UTC, datetime
from typing import Any, TypeAlias

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.db.base import Base
from app.infrastructure.db.models.exercise import Exercise
from app.infrastructure.db.session import get_db
from app.main import app

SessionFactory: TypeAlias = Callable[[], Session]


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


def create_private_exercise(client: TestClient, token: str, name: str = "Private lift") -> str:
    response = client.post(
        "/exercises",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "difficulty": "beginner"},
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_session(
    client: TestClient,
    token: str,
    exercise_id: str,
    started_at: datetime,
    sets: list[dict[str, Any]],
) -> dict[str, Any]:
    response = client.post(
        "/workout-sessions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "started_at": started_at.isoformat(),
            "timezone": "Europe/Madrid",
            "sets": [{"exercise_id": exercise_id, **workout_set} for workout_set in sets],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_exercise_stats_calculate_sets_reps_volume_and_load(
    client_with_db: tuple[TestClient, SessionFactory],
) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    create_session(
        client,
        token,
        str(exercise.id),
        datetime(2026, 7, 2, 10, 0, tzinfo=UTC),
        [
            {"set_number": 1, "reps": 10, "weight_value": "50", "weight_unit": "kg"},
            {"set_number": 2, "reps": 5, "weight_value": "60", "weight_unit": "kg"},
        ],
    )

    response = client.get("/stats/exercises", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()[0]
    assert data["exercise_id"] == str(exercise.id)
    assert data["weight_unit"] == "kg"
    assert data["total_sets"] == 2
    assert data["total_reps"] == 15
    assert data["total_volume"] == "800.00"
    assert data["max_weight"] == "60.00"
    assert data["avg_weight"] == "55.00"
    assert data["best_estimated_1rm"] == "70.00"


def test_exercise_stats_do_not_include_other_users_sessions(
    client_with_db: tuple[TestClient, SessionFactory],
) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    owner_token = register_and_login(client, "owner@example.com", "owner_user")
    other_token = register_and_login(client, "other@example.com", "other_user")
    create_session(
        client,
        owner_token,
        str(exercise.id),
        datetime(2026, 7, 2, 10, 0, tzinfo=UTC),
        [{"set_number": 1, "reps": 10, "weight_value": "50", "weight_unit": "kg"}],
    )

    response = client.get("/stats/exercises", headers={"Authorization": f"Bearer {other_token}"})

    assert response.status_code == 200
    assert response.json() == []


def test_exercise_stats_exclude_deleted_sessions(client_with_db: tuple[TestClient, SessionFactory]) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    session = create_session(
        client,
        token,
        str(exercise.id),
        datetime(2026, 7, 2, 10, 0, tzinfo=UTC),
        [{"set_number": 1, "reps": 10, "weight_value": "50", "weight_unit": "kg"}],
    )

    delete_response = client.delete(
        f"/workout-sessions/{session['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    response = client.get("/stats/exercises", headers={"Authorization": f"Bearer {token}"})

    assert delete_response.status_code == 204
    assert response.status_code == 200
    assert response.json() == []


def test_exercise_stats_filter_by_date_range(client_with_db: tuple[TestClient, SessionFactory]) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    create_session(
        client,
        token,
        str(exercise.id),
        datetime(2026, 7, 1, 10, 0, tzinfo=UTC),
        [{"set_number": 1, "reps": 10, "weight_value": "50", "weight_unit": "kg"}],
    )
    create_session(
        client,
        token,
        str(exercise.id),
        datetime(2026, 7, 10, 10, 0, tzinfo=UTC),
        [{"set_number": 1, "reps": 5, "weight_value": "60", "weight_unit": "kg"}],
    )

    response = client.get(
        "/stats/exercises",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "start_date": datetime(2026, 7, 2, 0, 0, tzinfo=UTC).isoformat(),
            "end_date": datetime(2026, 7, 31, 23, 59, tzinfo=UTC).isoformat(),
        },
    )

    assert response.status_code == 200
    assert response.json()[0]["total_reps"] == 5
    assert response.json()[0]["total_volume"] == "300.00"


@pytest.mark.parametrize(
    ("period", "expected_prefix"),
    [
        ("day", "2026-07-08T00:00:00"),
        ("week", "2026-07-06T00:00:00"),
        ("month", "2026-07-01T00:00:00"),
    ],
)
def test_exercise_stats_group_by_period(
    client_with_db: tuple[TestClient, SessionFactory],
    period: str,
    expected_prefix: str,
) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    create_session(
        client,
        token,
        str(exercise.id),
        datetime(2026, 7, 8, 10, 0, tzinfo=UTC),
        [{"set_number": 1, "reps": 10, "weight_value": "50", "weight_unit": "kg"}],
    )

    response = client.get(
        f"/stats/exercises/{exercise.id}",
        headers={"Authorization": f"Bearer {token}"},
        params={"period": period},
    )

    assert response.status_code == 200
    assert response.json()["points"][0]["period_start"].startswith(expected_prefix)


def test_exercise_stats_keep_kg_and_lb_separate(client_with_db: tuple[TestClient, SessionFactory]) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory)
    token = register_and_login(client, "owner@example.com", "owner_user")
    create_session(
        client,
        token,
        str(exercise.id),
        datetime(2026, 7, 2, 10, 0, tzinfo=UTC),
        [
            {"set_number": 1, "reps": 10, "weight_value": "50", "weight_unit": "kg"},
            {"set_number": 2, "reps": 10, "weight_value": "100", "weight_unit": "lb"},
        ],
    )

    response = client.get("/stats/exercises", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert [item["weight_unit"] for item in response.json()] == ["kg", "lb"]


def test_exercise_stats_count_unweighted_sets_without_load_metrics(
    client_with_db: tuple[TestClient, SessionFactory],
) -> None:
    client, session_factory = client_with_db
    exercise = seed_global_exercise(session_factory, name="Push-up")
    token = register_and_login(client, "owner@example.com", "owner_user")
    create_session(
        client,
        token,
        str(exercise.id),
        datetime(2026, 7, 2, 10, 0, tzinfo=UTC),
        [{"set_number": 1, "reps": 20}],
    )

    response = client.get("/stats/exercises", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()[0]
    assert data["weight_unit"] is None
    assert data["total_sets"] == 1
    assert data["total_reps"] == 20
    assert data["total_volume"] is None
    assert data["max_weight"] is None
    assert data["best_estimated_1rm"] is None


def test_exercise_stats_return_404_for_inaccessible_private_exercise(
    client_with_db: tuple[TestClient, SessionFactory],
) -> None:
    client, _session_factory = client_with_db
    owner_token = register_and_login(client, "owner@example.com", "owner_user")
    other_token = register_and_login(client, "other@example.com", "other_user")
    exercise_id = create_private_exercise(client, owner_token)

    response = client.get(
        f"/stats/exercises/{exercise_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 404
