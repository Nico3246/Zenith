from collections import defaultdict
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.application.ai_provider import AiCoachQuestionProviderContext, enrich_coach_question_with_provider
from app.domain.ai import AiCoachQuestionRead, AiCoachQuestionRequest
from app.infrastructure.db.models.exercise import Exercise
from app.infrastructure.db.models.routine import Routine
from app.infrastructure.db.models.user import User
from app.infrastructure.db.models.workout import WorkoutSession, WorkoutSet
from app.infrastructure.db.repositories.ai_suggestions import AiSuggestionRepository
from app.infrastructure.db.repositories.exercises import ExerciseRepository
from app.infrastructure.db.repositories.routines import RoutineRepository, WorkoutSessionRepository
from app.infrastructure.db.repositories.stats import StatsRepository


class AiCoachQuestionNotFoundError(Exception):
    pass


class AiCoachQuestionCannotAnswerError(Exception):
    pass


class AiCoachQuestionService:
    def answer_question(self, db: Session, user: User, data: AiCoachQuestionRequest) -> AiCoachQuestionRead:
        routines = RoutineRepository(db).list_by_user(user.id)
        sessions = WorkoutSessionRepository(db).list_by_user(user.id)
        exercise_repository = ExerciseRepository(db)
        accessible_exercises = exercise_repository.list_accessible(user.id)
        exercises = {exercise.id: exercise for exercise in accessible_exercises}

        selected_routine = self._selected_routine(db, data.routine_id, user.id)
        selected_session = self._selected_session(db, data.session_id, user.id)
        selected_exercise = self._selected_exercise(exercise_repository, data.exercise_id, user.id)

        stats_rows = StatsRepository(db).list_workout_sets(user_id=user.id, exercise_id=data.exercise_id)
        input_summary = self._input_summary(
            data=data,
            routines=routines,
            sessions=sessions,
            exercises=exercises,
            selected_routine=selected_routine,
            selected_session=selected_session,
            selected_exercise=selected_exercise,
            stats_rows=stats_rows,
            pending_suggestions=AiSuggestionRepository(db).list_by_user(user.id),
        )
        answer, key_points, suggested_actions = self._base_answer(data.question_type, input_summary)
        provider_result = enrich_coach_question_with_provider(
            AiCoachQuestionProviderContext(
                question_type=data.question_type,
                input_summary=input_summary,
                answer=answer,
                key_points=key_points,
                suggested_actions=suggested_actions,
            )
        )
        input_summary = {
            **input_summary,
            "ai_provider": {
                "provider": provider_result.provider,
                "model": provider_result.model,
                "external_data_sent": provider_result.external_data_sent,
                "fallback_used": provider_result.fallback_used,
                "prompt_summary": {
                    "included_notes": False,
                    "included_account_data": False,
                    "included_detail_text": False,
                    "included_metrics": True,
                },
            },
        }
        return AiCoachQuestionRead(
            question_type=data.question_type,
            answer=provider_result.answer,
            key_points=provider_result.key_points,
            related_metrics=input_summary["related_metrics"],
            suggested_actions=provider_result.suggested_actions,
            provider=provider_result.provider,
            model=provider_result.model,
            fallback_used=provider_result.fallback_used,
            input_summary=input_summary,
        )

    def _selected_routine(self, db: Session, routine_id: UUID | None, user_id: UUID) -> Routine | None:
        if routine_id is None:
            return None
        routine = RoutineRepository(db).get_by_user(routine_id, user_id)
        if routine is None:
            raise AiCoachQuestionNotFoundError
        return routine

    def _selected_session(self, db: Session, session_id: UUID | None, user_id: UUID) -> WorkoutSession | None:
        if session_id is None:
            return None
        session = WorkoutSessionRepository(db).get_by_user(session_id, user_id)
        if session is None:
            raise AiCoachQuestionNotFoundError
        return session

    def _selected_exercise(self, repository: ExerciseRepository, exercise_id: UUID | None, user_id: UUID) -> Exercise | None:
        if exercise_id is None:
            return None
        exercise = repository.get_accessible(exercise_id, user_id)
        if exercise is None:
            raise AiCoachQuestionNotFoundError
        return exercise

    def _input_summary(
        self,
        *,
        data: AiCoachQuestionRequest,
        routines: list[Routine],
        sessions: list[WorkoutSession],
        exercises: dict[UUID, Exercise],
        selected_routine: Routine | None,
        selected_session: WorkoutSession | None,
        selected_exercise: Exercise | None,
        stats_rows,
        pending_suggestions,
    ) -> dict:
        pending = [suggestion for suggestion in pending_suggestions if suggestion.status == "pending"][:5]
        recent_sessions = sessions[:5]
        related_metrics = self._related_metrics(recent_sessions, stats_rows)
        return {
            "privacy": {
                "notes_included": False,
                "email_included": False,
                "username_included": False,
                "tokens_included": False,
                "detail_text_included": False,
            },
            "question": {
                "question_type": data.question_type,
                "routine_id": str(data.routine_id) if data.routine_id else None,
                "exercise_id": str(data.exercise_id) if data.exercise_id else None,
                "session_id": str(data.session_id) if data.session_id else None,
                "detail_present": bool(data.detail),
            },
            "selected": {
                "routine": self._routine_summary(selected_routine, exercises) if selected_routine else None,
                "exercise": self._exercise_summary(selected_exercise) if selected_exercise else None,
                "session": self._session_summary(selected_session) if selected_session else None,
            },
            "routines": [self._routine_summary(routine, exercises) for routine in routines[:5]],
            "recent_sessions": [self._session_summary(session) for session in recent_sessions],
            "pending_suggestions": [
                {
                    "id": str(suggestion.id),
                    "type": suggestion.type,
                    "routine_id": str(suggestion.routine_id) if suggestion.routine_id else None,
                    "exercise_id": str(suggestion.exercise_id) if suggestion.exercise_id else None,
                    "recommendation": suggestion.recommendation,
                    "confidence": suggestion.confidence,
                }
                for suggestion in pending
            ],
            "related_metrics": related_metrics,
        }

    def _routine_summary(self, routine: Routine, exercises: dict[UUID, Exercise]) -> dict:
        return {
            "id": str(routine.id),
            "name": routine.name,
            "goal": routine.goal,
            "exercise_count": len(routine.exercises),
            "exercises": [
                {
                    "routine_exercise_id": str(planned.id),
                    "exercise_id": str(planned.exercise_id),
                    "exercise_name": exercises.get(planned.exercise_id).name if exercises.get(planned.exercise_id) else "Ejercicio",
                    "position": planned.position,
                    "target_sets": planned.target_sets,
                    "target_reps_min": planned.target_reps_min,
                    "target_reps_max": planned.target_reps_max,
                    "target_weight_value": str(planned.target_weight_value) if planned.target_weight_value is not None else None,
                    "target_weight_unit": planned.target_weight_unit,
                    "target_rpe": str(planned.target_rpe) if planned.target_rpe is not None else None,
                    "target_rir": planned.target_rir,
                    "rest_seconds": planned.rest_seconds,
                }
                for planned in routine.exercises[:8]
            ],
        }

    def _exercise_summary(self, exercise: Exercise | None) -> dict | None:
        if exercise is None:
            return None
        return {
            "id": str(exercise.id),
            "name": exercise.name,
            "difficulty": exercise.difficulty,
            "muscle_groups": [muscle.name for muscle in exercise.muscle_groups],
            "equipment": [equipment.name for equipment in exercise.equipment],
        }

    def _session_summary(self, session: WorkoutSession | None) -> dict | None:
        if session is None:
            return None
        return {
            "id": str(session.id),
            "routine_id": str(session.routine_id) if session.routine_id else None,
            "started_at": session.started_at.isoformat(),
            "finished_at": session.finished_at.isoformat() if session.finished_at else None,
            "timezone": session.timezone,
            "sets": len(session.sets),
            "total_reps": sum(workout_set.reps for workout_set in session.sets),
            "volume_by_unit": self._volume_by_unit(session.sets),
            "avg_rpe": self._average_decimal([workout_set.rpe for workout_set in session.sets if workout_set.rpe is not None]),
            "avg_rir": self._average_int([workout_set.rir for workout_set in session.sets if workout_set.rir is not None]),
        }

    def _related_metrics(self, sessions: list[WorkoutSession], stats_rows) -> dict:
        volume_by_unit: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        exercise_metrics: dict[tuple[UUID, str | None], dict] = {}
        for workout_set, workout_session, exercise in stats_rows:
            unit = workout_set.weight_unit
            key = (exercise.id, unit)
            metrics = exercise_metrics.setdefault(
                key,
                {
                    "exercise_id": str(exercise.id),
                    "exercise_name": exercise.name,
                    "weight_unit": unit,
                    "total_sets": 0,
                    "total_reps": 0,
                    "total_volume": None,
                    "max_weight": None,
                    "last_session_at": None,
                },
            )
            metrics["total_sets"] += 1
            metrics["total_reps"] += workout_set.reps
            metrics["last_session_at"] = workout_session.started_at.isoformat()
            if workout_set.weight_value is not None and unit is not None:
                current_volume = Decimal(str(metrics["total_volume"] or "0"))
                metrics["total_volume"] = str(current_volume + workout_set.weight_value * workout_set.reps)
                metrics["max_weight"] = str(max(Decimal(str(metrics["max_weight"] or "0")), workout_set.weight_value))
                volume_by_unit[unit] += workout_set.weight_value * workout_set.reps

        session_summaries = [self._session_summary(session) for session in sessions]
        return {
            "recent_session_count": len(sessions),
            "recent_sets": sum(session["sets"] for session in session_summaries if session),
            "recent_reps": sum(session["total_reps"] for session in session_summaries if session),
            "recent_volume_by_unit": {unit: str(value) for unit, value in sorted(volume_by_unit.items())},
            "avg_recent_rpe": self._average_decimal(
                [workout_set.rpe for session in sessions for workout_set in session.sets if workout_set.rpe is not None]
            ),
            "avg_recent_rir": self._average_int(
                [workout_set.rir for session in sessions for workout_set in session.sets if workout_set.rir is not None]
            ),
            "exercises": list(exercise_metrics.values())[:8],
        }

    def _base_answer(self, question_type: str, input_summary: dict) -> tuple[str, list[str], list[str]]:
        metrics = input_summary["related_metrics"]
        selected = input_summary["selected"]
        pending_count = len(input_summary["pending_suggestions"])
        routine = selected["routine"] or (input_summary["routines"][0] if input_summary["routines"] else None)
        session_count = metrics["recent_session_count"]
        high_effort = self._is_high_effort(metrics)

        if question_type == "next_workout":
            routine_name = routine["name"] if routine else "tu rutina activa"
            answer = f"Para la proxima sesion, usa {routine_name} como base y evita cambiar muchas variables a la vez."
            key_points = [f"Sesiones recientes analizadas: {session_count}."]
            if pending_count:
                key_points.append(f"Hay {pending_count} sugerencia(s) pendiente(s) para revisar antes de progresar.")
            if high_effort:
                key_points.append("Las senales recientes apuntan a esfuerzo alto; conviene priorizar tecnica y recuperacion.")
            suggested_actions = ["Repite cargas si la tecnica no fue estable.", "Sube solo un parametro si completaste el rango objetivo con margen."]
        elif question_type == "progression":
            answer = "Progresa de forma conservadora: primero consolida repeticiones objetivo y despues sube carga o volumen."
            key_points = [f"Series recientes registradas: {metrics['recent_sets']}."]
            if metrics["recent_volume_by_unit"]:
                key_points.append(f"Volumen reciente por unidad: {metrics['recent_volume_by_unit']}.")
            suggested_actions = ["Mantén la misma unidad de peso al comparar progresos.", "Si llegas al maximo de reps con RIR 2 o mas, sube carga ligeramente."]
        elif question_type == "fatigue":
            answer = "La decision debe basarse en rendimiento, RPE/RIR y caidas de reps; no bajes carga solo por una sesion aislada."
            key_points = [f"RPE medio reciente: {metrics['avg_recent_rpe'] or 'sin datos'}.", f"RIR medio reciente: {metrics['avg_recent_rir'] if metrics['avg_recent_rir'] is not None else 'sin datos'}." ]
            if high_effort:
                key_points.append("Hay indicadores de esfuerzo alto en las sesiones recientes.")
            suggested_actions = ["Si RPE es alto o RIR bajo, mantén o reduce intensidad en la proxima sesion.", "Si el rendimiento cae dos o tres sesiones, considera deload o menos volumen."]
        elif question_type == "routine_review":
            if routine is None:
                raise AiCoachQuestionCannotAnswerError("Routine context is required.")
            answer = f"La rutina {routine['name']} tiene {routine['exercise_count']} ejercicio(s); revisa que el objetivo y los rangos coincidan."
            key_points = [f"Objetivo declarado: {routine['goal'] or 'sin objetivo' }.", f"Ejercicios planificados: {routine['exercise_count']}."]
            suggested_actions = ["Mantén rangos de reps coherentes con el objetivo.", "Acepta cambios solo desde sugerencias revisables si quieres modificar la rutina."]
        else:
            answer = "Las estadisticas resumen volumen, repeticiones y carga sin mezclar kg y lb."
            key_points = [f"Ejercicios con metricas: {len(metrics['exercises'])}."]
            if metrics["recent_volume_by_unit"]:
                key_points.append(f"Volumen separado por unidad: {metrics['recent_volume_by_unit']}.")
            suggested_actions = ["Compara ejercicios usando la misma unidad de peso.", "Usa tendencias de varias sesiones, no una sola marca aislada."]

        if input_summary["question"]["detail_present"]:
            key_points.append("El detalle libre no se envia a proveedores externos ni se guarda en el contexto de IA.")
        return answer, key_points, suggested_actions

    def _is_high_effort(self, metrics: dict) -> bool:
        avg_rpe = Decimal(str(metrics["avg_recent_rpe"])) if metrics["avg_recent_rpe"] is not None else None
        avg_rir = metrics["avg_recent_rir"]
        return (avg_rpe is not None and avg_rpe >= Decimal("8.5")) or (avg_rir is not None and avg_rir <= 1)

    def _volume_by_unit(self, sets: list[WorkoutSet]) -> dict[str, str]:
        volume_by_unit: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for workout_set in sets:
            if workout_set.weight_value is not None and workout_set.weight_unit is not None:
                volume_by_unit[workout_set.weight_unit] += workout_set.weight_value * workout_set.reps
        return {unit: str(value) for unit, value in sorted(volume_by_unit.items())}

    def _average_decimal(self, values: list[Decimal]) -> str | None:
        if not values:
            return None
        return str((sum(values) / len(values)).quantize(Decimal("0.1")))

    def _average_int(self, values: list[int]) -> int | None:
        if not values:
            return None
        return round(sum(values) / len(values))


ai_coach_question_service = AiCoachQuestionService()
