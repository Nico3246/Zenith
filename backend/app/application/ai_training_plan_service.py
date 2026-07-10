import re
import unicodedata
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.application.ai_provider import AiTrainingPlanProviderContext, enrich_training_plan_with_provider
from app.domain.ai import AiTrainingPlanGenerateRequest, AiTrainingPlanModifyRequest
from app.infrastructure.db.models.ai import AiTrainingPlan
from app.infrastructure.db.models.exercise import Exercise
from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.exercises import ExerciseRepository
from app.infrastructure.db.repositories.routines import RoutineRepository
from app.infrastructure.db.repositories.training_plans import AiTrainingPlanRepository


class AiTrainingPlanNotFoundError(Exception):
    pass


class AiTrainingPlanNotDraftError(Exception):
    pass


class AiTrainingPlanCannotGenerateError(Exception):
    pass


class AiTrainingPlanService:
    def generate_plan(self, db: Session, user: User, data: AiTrainingPlanGenerateRequest) -> AiTrainingPlan:
        data = self._with_normalized_limitations(data)
        exercises = self._exercise_pool(db, user, data.available_equipment)
        if not exercises:
            raise AiTrainingPlanCannotGenerateError("No accessible exercises available.")

        plan_payload = self._build_plan_payload(data, exercises)
        self._validate_plan_payload(plan_payload, data, exercises)
        provider_result = self._enrich_plan_text(data, plan_payload)
        input_summary = self._input_summary(data, exercises, provider_result)
        plan = AiTrainingPlanRepository(db).create(
            user_id=user.id,
            goal=data.goal,
            level=data.level,
            days_per_week=data.days_per_week,
            session_duration_minutes=data.session_duration_minutes,
            available_equipment=data.available_equipment,
            physical_limitations=data.physical_limitations,
            sensitive_data_acknowledged=data.sensitive_data_acknowledged,
            priorities=data.priorities,
            plan_payload=plan_payload,
            explanation=provider_result.explanation,
            risk_notes=provider_result.risk_notes,
            confidence=provider_result.confidence,
            input_summary=input_summary,
            provider=provider_result.provider,
            model=provider_result.model,
            fallback_used=provider_result.fallback_used,
        )
        db.commit()
        return AiTrainingPlanRepository(db).get_by_user(plan.id, user.id) or plan

    def list_plans(self, db: Session, user: User) -> list[AiTrainingPlan]:
        return AiTrainingPlanRepository(db).list_by_user(user.id)

    def get_plan(self, db: Session, plan_id: UUID, user: User) -> AiTrainingPlan:
        plan = AiTrainingPlanRepository(db).get_by_user(plan_id, user.id)
        if plan is None:
            raise AiTrainingPlanNotFoundError
        return plan

    def accept_plan(self, db: Session, plan_id: UUID, user: User) -> AiTrainingPlan:
        repository = AiTrainingPlanRepository(db)
        plan = repository.get_by_user(plan_id, user.id)
        if plan is None:
            raise AiTrainingPlanNotFoundError
        if plan.status != "draft":
            raise AiTrainingPlanNotDraftError

        routine_repository = RoutineRepository(db)
        exercise_repository = ExerciseRepository(db)
        created_routine_ids: list[str] = []
        for day in plan.plan_payload.get("routines", []):
            routine = routine_repository.create(
                user_id=user.id,
                name=day["name"],
                description=day.get("description"),
                goal=plan.goal,
            )
            for position, planned in enumerate(day.get("exercises", []), start=1):
                exercise_id = UUID(str(planned["exercise_id"]))
                if exercise_repository.get_accessible(exercise_id, user.id) is None:
                    raise AiTrainingPlanCannotGenerateError("Plan references an inaccessible exercise.")
                routine_repository.add_exercise(
                    routine=routine,
                    exercise_id=exercise_id,
                    position=position,
                    target_sets=planned.get("target_sets"),
                    target_reps_min=planned.get("target_reps_min"),
                    target_reps_max=planned.get("target_reps_max"),
                    target_weight_value=None,
                    target_weight_unit=None,
                    target_rpe=planned.get("target_rpe"),
                    target_rir=planned.get("target_rir"),
                    rest_seconds=planned.get("rest_seconds"),
                    notes=None,
                )
            created_routine_ids.append(str(routine.id))

        plan.status = "accepted"
        plan.reviewed_at = datetime.now(UTC)
        plan.plan_payload = {**plan.plan_payload, "created_routine_ids": created_routine_ids}
        db.commit()
        return repository.get_by_user(plan.id, user.id) or plan

    def reject_plan(self, db: Session, plan_id: UUID, user: User) -> AiTrainingPlan:
        repository = AiTrainingPlanRepository(db)
        plan = repository.get_by_user(plan_id, user.id)
        if plan is None:
            raise AiTrainingPlanNotFoundError
        if plan.status != "draft":
            raise AiTrainingPlanNotDraftError
        plan.status = "rejected"
        plan.reviewed_at = datetime.now(UTC)
        db.commit()
        return repository.get_by_user(plan.id, user.id) or plan

    def modify_plan(
        self,
        db: Session,
        plan_id: UUID,
        user: User,
        data: AiTrainingPlanModifyRequest,
    ) -> AiTrainingPlan:
        repository = AiTrainingPlanRepository(db)
        original = repository.get_by_user(plan_id, user.id)
        if original is None:
            raise AiTrainingPlanNotFoundError
        if original.status != "draft":
            raise AiTrainingPlanNotDraftError

        base_request = AiTrainingPlanGenerateRequest(
            goal=original.goal,
            level=original.level,
            days_per_week=original.days_per_week,
            session_duration_minutes=original.session_duration_minutes,
            available_equipment=original.available_equipment,
            physical_limitations=original.physical_limitations,
            sensitive_data_acknowledged=original.sensitive_data_acknowledged or data.sensitive_data_acknowledged,
            priorities=original.priorities,
        )
        modified_request, post_process = self._apply_modification_instruction(base_request, data.instruction)
        modified_request = self._with_normalized_limitations(modified_request)
        exercises = self._exercise_pool(db, user, modified_request.available_equipment)
        if not exercises:
            raise AiTrainingPlanCannotGenerateError("No accessible exercises available.")

        plan_payload = self._build_plan_payload(modified_request, exercises)
        plan_payload = self._post_process_plan_payload(plan_payload, post_process)
        self._validate_plan_payload(plan_payload, modified_request, exercises)
        provider_result = self._enrich_plan_text(modified_request, plan_payload, modification_instruction=data.instruction)
        input_summary = self._input_summary(
            modified_request,
            exercises,
            provider_result,
            modified_from_plan_id=str(original.id),
            modification_instruction=data.instruction,
        )
        plan = repository.create(
            user_id=user.id,
            goal=modified_request.goal,
            level=modified_request.level,
            days_per_week=modified_request.days_per_week,
            session_duration_minutes=modified_request.session_duration_minutes,
            available_equipment=modified_request.available_equipment,
            physical_limitations=modified_request.physical_limitations,
            sensitive_data_acknowledged=modified_request.sensitive_data_acknowledged,
            priorities=modified_request.priorities,
            plan_payload=plan_payload,
            explanation=provider_result.explanation,
            risk_notes=provider_result.risk_notes,
            confidence=provider_result.confidence,
            input_summary=input_summary,
            provider=provider_result.provider,
            model=provider_result.model,
            fallback_used=provider_result.fallback_used,
        )
        db.commit()
        return repository.get_by_user(plan.id, user.id) or plan

    def _exercise_pool(self, db: Session, user: User, available_equipment: list[str]) -> list[Exercise]:
        exercises = ExerciseRepository(db).list_accessible(user.id)
        equipment_filter = {item.strip().lower() for item in available_equipment if item.strip()}
        if not equipment_filter:
            return exercises
        filtered = [
            exercise
            for exercise in exercises
            if not exercise.equipment
            or any(equipment.name.lower() in equipment_filter for equipment in exercise.equipment)
        ]
        return filtered or exercises

    def _with_normalized_limitations(self, data: AiTrainingPlanGenerateRequest) -> AiTrainingPlanGenerateRequest:
        limitations = data.physical_limitations.strip() if data.physical_limitations else None
        return data.model_copy(update={"physical_limitations": limitations or None})

    def _input_summary(
        self,
        data: AiTrainingPlanGenerateRequest,
        exercises: list[Exercise],
        provider_result,
        *,
        modified_from_plan_id: str | None = None,
        modification_instruction: str | None = None,
    ) -> dict:
        summary = {
            "privacy": {
                "provider": provider_result.provider,
                "model": provider_result.model,
                "external_data_sent": provider_result.external_data_sent,
                "notes_included": False,
                "physical_limitations_included": bool(data.physical_limitations),
                "sensitive_data_acknowledged": data.sensitive_data_acknowledged,
            },
            "request": {
                "goal": data.goal,
                "level": data.level,
                "days_per_week": data.days_per_week,
                "session_duration_minutes": data.session_duration_minutes,
                "available_equipment": data.available_equipment,
                "priorities": data.priorities,
            },
            "ai_provider": {
                "provider": provider_result.provider,
                "model": provider_result.model,
                "external_data_sent": provider_result.external_data_sent,
                "fallback_used": provider_result.fallback_used,
            },
            "available_exercise_count": len(exercises),
        }
        if modified_from_plan_id is not None:
            summary["modified_from_plan_id"] = modified_from_plan_id
        if modification_instruction is not None:
            summary["modification_instruction"] = modification_instruction
        return summary

    def _enrich_plan_text(
        self,
        data: AiTrainingPlanGenerateRequest,
        plan_payload: dict,
        *,
        modification_instruction: str | None = None,
    ):
        routines = plan_payload.get("routines", [])
        context = AiTrainingPlanProviderContext(
            goal=data.goal,
            level=data.level,
            days_per_week=data.days_per_week,
            session_duration_minutes=data.session_duration_minutes,
            available_equipment=data.available_equipment,
            priorities=data.priorities,
            has_physical_limitations=bool(data.physical_limitations),
            routine_count=len(routines) if isinstance(routines, list) else 0,
            exercises_per_routine=[len(routine.get("exercises", [])) for routine in routines if isinstance(routine, dict)],
            base_explanation=self._explanation(data),
            base_risk_notes=self._risk_notes(data),
            modification_instruction=modification_instruction,
        )
        return enrich_training_plan_with_provider(context)

    def _validate_plan_payload(
        self,
        plan_payload: dict,
        data: AiTrainingPlanGenerateRequest,
        exercises: list[Exercise],
    ) -> None:
        routines = plan_payload.get("routines")
        if not isinstance(routines, list) or len(routines) != data.days_per_week:
            raise AiTrainingPlanCannotGenerateError("Generated plan routine count is invalid.")

        accessible_exercise_ids = {str(exercise.id) for exercise in exercises}
        for index, routine in enumerate(routines, start=1):
            if not isinstance(routine, dict):
                raise AiTrainingPlanCannotGenerateError("Generated plan routine is invalid.")
            if routine.get("day") != index:
                raise AiTrainingPlanCannotGenerateError("Generated plan routine day is invalid.")
            if not isinstance(routine.get("name"), str) or not routine["name"].strip():
                raise AiTrainingPlanCannotGenerateError("Generated plan routine name is invalid.")
            planned_exercises = routine.get("exercises")
            if not isinstance(planned_exercises, list) or not planned_exercises:
                raise AiTrainingPlanCannotGenerateError("Generated plan exercises are invalid.")
            for planned in planned_exercises:
                self._validate_planned_exercise(planned, accessible_exercise_ids)

    def _validate_planned_exercise(self, planned: dict, accessible_exercise_ids: set[str]) -> None:
        if not isinstance(planned, dict):
            raise AiTrainingPlanCannotGenerateError("Generated plan exercise is invalid.")
        exercise_id = planned.get("exercise_id")
        if not isinstance(exercise_id, str) or exercise_id not in accessible_exercise_ids:
            raise AiTrainingPlanCannotGenerateError("Generated plan references an inaccessible exercise.")
        target_sets = planned.get("target_sets")
        reps_min = planned.get("target_reps_min")
        reps_max = planned.get("target_reps_max")
        rest_seconds = planned.get("rest_seconds")
        target_rir = planned.get("target_rir")
        if not isinstance(target_sets, int) or target_sets < 1 or target_sets > 10:
            raise AiTrainingPlanCannotGenerateError("Generated plan target sets are invalid.")
        if not isinstance(reps_min, int) or not isinstance(reps_max, int) or reps_min < 1 or reps_max > 50 or reps_min > reps_max:
            raise AiTrainingPlanCannotGenerateError("Generated plan target reps are invalid.")
        if not isinstance(rest_seconds, int) or rest_seconds < 0 or rest_seconds > 600:
            raise AiTrainingPlanCannotGenerateError("Generated plan rest is invalid.")
        if target_rir is not None and (not isinstance(target_rir, int) or target_rir < 0 or target_rir > 10):
            raise AiTrainingPlanCannotGenerateError("Generated plan target RIR is invalid.")
        try:
            target_rpe = float(planned.get("target_rpe"))
        except (TypeError, ValueError) as error:
            raise AiTrainingPlanCannotGenerateError("Generated plan target RPE is invalid.") from error
        if target_rpe < 1 or target_rpe > 10:
            raise AiTrainingPlanCannotGenerateError("Generated plan target RPE is invalid.")

    def _apply_modification_instruction(
        self, data: AiTrainingPlanGenerateRequest, instruction: str
    ) -> tuple[AiTrainingPlanGenerateRequest, dict]:
        normalized = unicodedata.normalize("NFKD", instruction).encode("ascii", "ignore").decode().lower()
        days_per_week = data.days_per_week
        duration = data.session_duration_minutes
        goal = data.goal
        priorities = list(data.priorities)
        post_process: dict = {}

        day_match = re.search(r"\b([1-7])\s*(dias|days)\b", normalized)
        if day_match:
            days_per_week = int(day_match.group(1))
        if "mas corto" in normalized or "menos tiempo" in normalized:
            duration = max(20, duration - 15)
            post_process["max_exercises_per_day"] = 3
        if "menos volumen" in normalized or "menos series" in normalized:
            post_process["sets_delta"] = -1
        if "mas volumen" in normalized or "mas series" in normalized:
            post_process["sets_delta"] = 1
        if "fuerza" in normalized:
            goal = "strength"
        elif "hipertrofia" in normalized:
            goal = "hypertrophy"
        elif "resistencia" in normalized:
            goal = "endurance"
        for priority in ["pecho", "espalda", "pierna", "hombro", "gluteo", "brazos"]:
            if priority in normalized and priority not in priorities:
                priorities.append(priority)

        modified = AiTrainingPlanGenerateRequest(
            goal=goal,
            level=data.level,
            days_per_week=days_per_week,
            session_duration_minutes=duration,
            available_equipment=data.available_equipment,
            physical_limitations=data.physical_limitations,
            sensitive_data_acknowledged=data.sensitive_data_acknowledged,
            priorities=priorities[:10],
        )
        return modified, post_process

    def _post_process_plan_payload(self, plan_payload: dict, post_process: dict) -> dict:
        routines = []
        for routine in plan_payload.get("routines", []):
            exercises = list(routine.get("exercises", []))
            max_exercises = post_process.get("max_exercises_per_day")
            if max_exercises is not None:
                exercises = exercises[:max_exercises]
            sets_delta = post_process.get("sets_delta")
            if sets_delta:
                exercises = [
                    {
                        **exercise,
                        "target_sets": max(1, int(exercise.get("target_sets") or 1) + sets_delta),
                    }
                    for exercise in exercises
                ]
            routines.append({**routine, "exercises": exercises})
        return {**plan_payload, "routines": routines}

    def _build_plan_payload(self, data: AiTrainingPlanGenerateRequest, exercises: list[Exercise]) -> dict:
        prescription = self._prescription_for(data.goal, data.level)
        routines = []
        exercises_per_day = 3 if data.session_duration_minutes < 45 else 4
        for day_number in range(1, data.days_per_week + 1):
            selected = [exercises[(day_number - 1 + offset) % len(exercises)] for offset in range(exercises_per_day)]
            routines.append(
                {
                    "day": day_number,
                    "name": f"Plan IA Dia {day_number}",
                    "description": f"Rutina generada para objetivo {data.goal} y nivel {data.level}.",
                    "exercises": [
                        {
                            "exercise_id": str(exercise.id),
                            "exercise_name": exercise.name,
                            **prescription,
                        }
                        for exercise in selected
                    ],
                }
            )
        return {"version": 1, "routines": routines, "progression": "Revisa el rendimiento cada 2-3 sesiones antes de subir carga."}

    def _prescription_for(self, goal: str, level: str) -> dict:
        if goal == "strength":
            base = {"target_sets": 4, "target_reps_min": 3, "target_reps_max": 6, "rest_seconds": 180, "target_rpe": "8", "target_rir": 2}
        elif goal == "endurance":
            base = {"target_sets": 2, "target_reps_min": 12, "target_reps_max": 20, "rest_seconds": 60, "target_rpe": "7", "target_rir": 3}
        else:
            base = {"target_sets": 3, "target_reps_min": 8, "target_reps_max": 12, "rest_seconds": 90, "target_rpe": "8", "target_rir": 2}
        if level == "beginner":
            base = {**base, "target_sets": max(2, base["target_sets"] - 1)}
        if level == "advanced":
            base = {**base, "target_sets": base["target_sets"] + 1}
        return base

    def _explanation(self, data: AiTrainingPlanGenerateRequest) -> str:
        return f"Plan adaptativo de {data.days_per_week} dias para objetivo {data.goal}, nivel {data.level} y sesiones de {data.session_duration_minutes} minutos."

    def _risk_notes(self, data: AiTrainingPlanGenerateRequest) -> str | None:
        if data.physical_limitations:
            return "Has indicado limitaciones fisicas. Este plan no sustituye consejo medico; evita ejercicios que causen dolor y consulta a un profesional si hay dudas."
        return "Si aparece dolor, mareo o perdida clara de tecnica, detén la sesion y ajusta la carga."


ai_training_plan_service = AiTrainingPlanService()
