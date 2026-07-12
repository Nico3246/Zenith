import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  acceptTrainingPlan,
  AiCoachQuestionResponse,
  AiCoachQuestionType,
  AiTrainingPlan,
  askCoachQuestion,
  generateTrainingPlan,
  getRoutines,
  getTrainingPlans,
  getWorkoutSessions,
  modifyTrainingPlan,
  rejectTrainingPlan,
  Routine,
  TrainingPlanGoal,
  TrainingPlanLevel,
  WorkoutSession,
} from '@/api/client';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedField } from '@/components/SegmentedField';
import { ZenithCard, ZenithHeader, ZenithNotice, ZenithPill } from '@/components/ZenithUI';
import { ZenithScreen } from '@/components/ZenithScreen';
import { zenith } from '@/constants/zenithTheme';

const GOALS: { label: string; value: TrainingPlanGoal }[] = [
  { label: 'Hipertrofia', value: 'hypertrophy' },
  { label: 'Fuerza', value: 'strength' },
  { label: 'Perdida grasa', value: 'fat_loss' },
  { label: 'Salud', value: 'general_health' },
  { label: 'Resistencia', value: 'endurance' },
];

const LEVELS: { label: string; value: TrainingPlanLevel }[] = [
  { label: 'Principiante', value: 'beginner' },
  { label: 'Intermedio', value: 'intermediate' },
  { label: 'Avanzado', value: 'advanced' },
];

const QUESTION_TYPES: { label: string; value: AiCoachQuestionType }[] = [
  { label: 'Proxima', value: 'next_workout' },
  { label: 'Progresion', value: 'progression' },
  { label: 'Fatiga', value: 'fatigue' },
  { label: 'Rutina', value: 'routine_review' },
  { label: 'Stats', value: 'stats_explanation' },
];

function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function routinesFromPlan(plan: AiTrainingPlan) {
  const routines = plan.plan_payload.routines;
  return Array.isArray(routines) ? routines.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];
}

function exercisesFromPlanRoutine(routine: Record<string, unknown>) {
  const exercises = routine.exercises;
  return Array.isArray(exercises) ? exercises.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];
}

function textValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function planExerciseSummary(exercise: Record<string, unknown>) {
  const name = textValue(exercise.exercise_name) || 'Ejercicio';
  const sets = textValue(exercise.target_sets) || '-';
  const repsMin = textValue(exercise.target_reps_min) || '-';
  const repsMax = textValue(exercise.target_reps_max) || '-';
  const rest = textValue(exercise.rest_seconds) || '-';
  const rpe = textValue(exercise.target_rpe) || '-';
  const rir = textValue(exercise.target_rir) || '-';
  return `${name}: ${sets} series · ${repsMin}-${repsMax} reps · ${rest}s · RPE ${rpe} · RIR ${rir}`;
}

function progressionFromPlan(plan: AiTrainingPlan) {
  const progression = plan.plan_payload.progression;
  return typeof progression === 'string' ? progression : null;
}

function includesSensitiveModification(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['dolor', 'lesion', 'molestia', 'rodilla', 'limitacion'].some((marker) => normalized.includes(marker));
}

function modifiedFrom(plan: AiTrainingPlan) {
  const value = plan.input_summary.modified_from_plan_id;
  return typeof value === 'string' ? value : null;
}

function providerInfo(provider: string, model: string | null, fallbackUsed: boolean) {
  const modelLabel = model ? ` · ${model}` : '';
  const fallback = fallbackUsed ? ' · fallback interno' : '';
  return `${provider}${modelLabel}${fallback}`;
}

function providerSummary(plan: AiTrainingPlan) {
  return providerInfo(plan.provider, plan.model, plan.fallback_used);
}

function routineNameById(routineId: string | null, routines: Routine[]) {
  if (!routineId) {
    return 'Sesion libre';
  }
  return routines.find((routine) => routine.id === routineId)?.name ?? 'Rutina no encontrada';
}

export default function TrainerScreen() {
  const [goal, setGoal] = useState<TrainingPlanGoal>('hypertrophy');
  const [level, setLevel] = useState<TrainingPlanLevel>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [duration, setDuration] = useState('60');
  const [equipment, setEquipment] = useState('');
  const [priorities, setPriorities] = useState('');
  const [physicalLimitations, setPhysicalLimitations] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [plans, setPlans] = useState<AiTrainingPlan[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [questionType, setQuestionType] = useState<AiCoachQuestionType>('next_workout');
  const [questionRoutineId, setQuestionRoutineId] = useState<string | null>(null);
  const [questionDetail, setQuestionDetail] = useState('');
  const [questionResponse, setQuestionResponse] = useState<AiCoachQuestionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [modificationInputs, setModificationInputs] = useState<Record<string, string>>({});
  const [modificationAcks, setModificationAcks] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadPlans() {
    const items = await getTrainingPlans();
    setPlans(items);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTrainingPlans(), getRoutines(), getWorkoutSessions()])
      .then(([items, loadedRoutines, loadedSessions]) => {
        if (!cancelled) {
          setPlans(items);
          setRoutines(loadedRoutines);
          setSessions(loadedSessions);
          setQuestionRoutineId((current) => current ?? loadedRoutines[0]?.id ?? null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los planes.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitQuestion() {
    if (questionType === 'routine_review' && !questionRoutineId) {
      setError('Selecciona una rutina para revisar.');
      return;
    }

    setAsking(true);
    setError(null);
    setNotice(null);
    setQuestionResponse(null);
    try {
      const response = await askCoachQuestion({
        question_type: questionType,
        routine_id: questionRoutineId || null,
        detail: questionDetail.trim() || null,
      });
      setQuestionResponse(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo responder la pregunta.');
    } finally {
      setAsking(false);
    }
  }

  async function submitGenerate() {
    const parsedDays = Number(daysPerWeek);
    const parsedDuration = Number(duration);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 7) {
      setError('Los dias por semana deben estar entre 1 y 7.');
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 20 || parsedDuration > 180) {
      setError('La duracion debe estar entre 20 y 180 minutos.');
      return;
    }
    if (physicalLimitations.trim() && !acknowledged) {
      setError('Confirma el aviso de datos sensibles para usar limitaciones fisicas.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await generateTrainingPlan({
        goal,
        level,
        days_per_week: parsedDays,
        session_duration_minutes: parsedDuration,
        available_equipment: splitCsv(equipment),
        physical_limitations: physicalLimitations.trim() || null,
        sensitive_data_acknowledged: acknowledged,
        priorities: splitCsv(priorities),
      });
      await loadPlans();
      setNotice('Plan generado. Revisalo y aceptalo para crear las rutinas reales.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo generar el plan.');
    } finally {
      setSaving(false);
    }
  }

  async function submitAccept(planId: string) {
    setWorking(planId);
    setError(null);
    setNotice(null);
    try {
      await acceptTrainingPlan(planId);
      await loadPlans();
      setNotice('Plan aceptado. Se crearon rutinas reales automaticamente.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo aceptar el plan.');
    } finally {
      setWorking(null);
    }
  }

  async function submitReject(planId: string) {
    setWorking(planId);
    setError(null);
    setNotice(null);
    try {
      await rejectTrainingPlan(planId);
      await loadPlans();
      setNotice('Plan rechazado. No se crearon rutinas.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo rechazar el plan.');
    } finally {
      setWorking(null);
    }
  }

  async function submitModify(planId: string) {
    const instruction = modificationInputs[planId]?.trim() ?? '';
    const acknowledgedSensitiveData = modificationAcks[planId] ?? false;
    if (instruction.length < 3) {
      setError('Describe que quieres cambiar del plan.');
      return;
    }
    if (includesSensitiveModification(instruction) && !acknowledgedSensitiveData) {
      setError('Confirma el aviso de datos sensibles para pedir cambios por dolor, lesion o limitaciones.');
      return;
    }

    setWorking(planId);
    setError(null);
    setNotice(null);
    try {
      await modifyTrainingPlan(planId, {
        instruction,
        sensitive_data_acknowledged: acknowledgedSensitiveData,
      });
      setModificationInputs((current) => ({ ...current, [planId]: '' }));
      setModificationAcks((current) => ({ ...current, [planId]: false }));
      await loadPlans();
      setNotice('Se genero una nueva version del plan. El plan original no cambio.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo modificar el plan.');
    } finally {
      setWorking(null);
    }
  }

  return (
    <ZenithScreen>
      <ZenithHeader title="Plan adaptativo" subtitle="Entrenador personal" />
      <Text style={styles.subtitle}>La IA genera una rutina por dia disponible. Al aceptar, se crean rutinas reales en tu cuenta.</Text>
      <SegmentedField label="Objetivo" onValueChange={(value) => setGoal(value as TrainingPlanGoal)} options={GOALS} selectedValue={goal} />
      <SegmentedField label="Nivel" onValueChange={(value) => setLevel(value as TrainingPlanLevel)} options={LEVELS} selectedValue={level} />
      <View style={styles.grid}>
        <Field keyboardType="numeric" label="Dias por semana" onChangeText={setDaysPerWeek} value={daysPerWeek} />
        <Field keyboardType="numeric" label="Minutos por sesion" onChangeText={setDuration} value={duration} />
      </View>
      <Field label="Equipamiento disponible" onChangeText={setEquipment} placeholder="mancuernas, barra, polea" value={equipment} />
      <Field label="Prioridades" onChangeText={setPriorities} placeholder="pecho, fuerza, espalda" value={priorities} />
      <View style={styles.sensitiveBox}>
        <Text style={styles.sensitiveTitle}>Datos sensibles opcionales</Text>
        <Text style={styles.sensitiveText}>Las limitaciones fisicas pueden ser datos sensibles. Se usaran solo para generar este plan y no sustituyen consejo medico ni profesional. Evita anadir diagnosticos o detalles innecesarios.</Text>
        <Field label="Limitaciones fisicas opcionales" multiline onChangeText={setPhysicalLimitations} value={physicalLimitations} />
        <Pressable onPress={() => setAcknowledged((current) => !current)} style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
          <Text style={styles.checkboxText}>{acknowledged ? 'Confirmado' : 'Confirmo que entiendo el aviso de datos sensibles'}</Text>
        </Pressable>
      </View>
      <PrimaryButton disabled={saving} onPress={submitGenerate} title={saving ? 'Generando...' : 'Generar plan'} />
      {notice && <ZenithNotice tone="success">{notice}</ZenithNotice>}
      {error && <ZenithNotice tone="danger">{error}</ZenithNotice>}
      <ZenithCard style={styles.questionBox}>
        <Text style={styles.questionTitle}>Preguntar al entrenador</Text>
        <Text style={styles.questionText}>Preguntas guiadas sin chat libre: no se guardan y no modifican rutinas, sesiones ni planes.</Text>
        <SegmentedField label="Pregunta" onValueChange={(value) => setQuestionType(value as AiCoachQuestionType)} options={QUESTION_TYPES} selectedValue={questionType} />
        <View style={styles.routineSelector}>
          <Text style={styles.routineSelectorLabel}>Rutina para contexto</Text>
          {routines.length === 0 && <Text style={styles.emptyInline}>No hay rutinas todavia.</Text>}
          {routines.slice(0, 4).map((routine) => (
            <Pressable
              key={routine.id}
              onPress={() => setQuestionRoutineId(routine.id)}
              style={[styles.routineOption, questionRoutineId === routine.id && styles.routineOptionSelected]}
            >
              <Text style={[styles.routineOptionText, questionRoutineId === routine.id && styles.routineOptionTextSelected]}>{routine.name}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Detalle opcional"
          maxLength={500}
          multiline
          onChangeText={setQuestionDetail}
          placeholder="Ej: quiero saber si subir peso o repetir carga"
          value={questionDetail}
        />
        <PrimaryButton disabled={asking} onPress={submitQuestion} title={asking ? 'Preguntando...' : 'Preguntar'} />
        {questionResponse && (
          <View style={styles.answerBox}>
            <Text style={styles.answerTitle}>Respuesta</Text>
            <Text style={styles.cardText}>{questionResponse.answer}</Text>
            <Text style={styles.providerText}>Proveedor IA: {providerInfo(questionResponse.provider, questionResponse.model, questionResponse.fallback_used)}</Text>
            {questionResponse.key_points.map((point, index) => <Text key={`point-${index}`} style={styles.answerItem}>- {point}</Text>)}
            {questionResponse.suggested_actions.map((action, index) => <Text key={`action-${index}`} style={styles.actionItem}>Accion: {action}</Text>)}
          </View>
        )}
      </ZenithCard>
      <ZenithCard style={styles.summarySectionBox}>
        <Text style={styles.questionTitle}>Resumenes post-sesion</Text>
        <Text style={styles.questionText}>Genera o revisa resumenes IA desde el detalle de cada sesion. El resumen no modifica rutinas ni registros.</Text>
        {loading && <Text style={styles.emptyInline}>Cargando sesiones...</Text>}
        {!loading && sessions.length === 0 && <Text style={styles.emptyInline}>Todavia no hay sesiones para resumir.</Text>}
        {sessions.slice(0, 4).map((session) => (
          <ZenithCard key={session.id} style={styles.sessionSummaryCard}>
            <Text style={styles.sessionTitle}>{new Date(session.started_at).toLocaleDateString()} · {routineNameById(session.routine_id, routines)}</Text>
            <Text style={styles.cardText}>{session.sets.length} series registradas</Text>
            <Link href={{ pathname: '/session-detail', params: { sessionId: session.id } }} style={styles.summaryLink}>Abrir y generar resumen IA</Link>
          </ZenithCard>
        ))}
      </ZenithCard>
      <Text style={styles.section}>Mis planes</Text>
      {loading && <Text style={styles.empty}>Cargando planes...</Text>}
      {!loading && plans.length === 0 && <Text style={styles.empty}>Todavia no hay planes generados.</Text>}
      {plans.map((plan) => (
        <ZenithCard key={plan.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{plan.days_per_week} dias · {plan.goal}</Text>
            <ZenithPill active={plan.status === 'draft'}>{plan.status}</ZenithPill>
          </View>
          <Text style={styles.cardText}>{plan.explanation}</Text>
          {modifiedFrom(plan) && <Text style={styles.versionText}>Version modificada de otro plan.</Text>}
          <Text style={styles.providerText}>Proveedor IA: {providerSummary(plan)}</Text>
          {plan.risk_notes && <Text style={styles.risk}>{plan.risk_notes}</Text>}
          {routinesFromPlan(plan).map((routine, index) => (
            <View key={`${plan.id}-${index}`} style={styles.routineBox}>
              <Text style={styles.routineTitle}>{textValue(routine.name) || `Dia ${index + 1}`}</Text>
              <Text style={styles.cardText}>{exercisesFromPlanRoutine(routine).length} ejercicios</Text>
              {exercisesFromPlanRoutine(routine).slice(0, 5).map((exercise, exerciseIndex) => (
                <Text key={`${plan.id}-${index}-${exerciseIndex}`} style={styles.exerciseLine}>{planExerciseSummary(exercise)}</Text>
              ))}
            </View>
          ))}
          {progressionFromPlan(plan) && <Text style={styles.progressionText}>Progresion: {progressionFromPlan(plan)}</Text>}
          {plan.status === 'draft' && (
            <View style={styles.draftBox}>
              <Text style={styles.modifyTitle}>Pedir cambios antes de aceptar</Text>
              <Text style={styles.modifyText}>Se creara una nueva version draft. Esta version queda disponible para comparar o aceptar.</Text>
              <Field
                label="Modificacion solicitada"
                multiline
                onChangeText={(value) => setModificationInputs((current) => ({ ...current, [plan.id]: value }))}
                placeholder="Ej: hazlo a 4 dias, menos volumen, mas espalda"
                value={modificationInputs[plan.id] ?? ''}
              />
              <Text style={styles.sensitiveText}>Si incluyes dolor, lesion o limitaciones fisicas, confirma que entiendes que son datos sensibles y que se usaran solo para generar esta version del plan.</Text>
              <Pressable
                onPress={() => setModificationAcks((current) => ({ ...current, [plan.id]: !current[plan.id] }))}
                style={[styles.checkbox, modificationAcks[plan.id] && styles.checkboxChecked]}
              >
                <Text style={styles.checkboxText}>{modificationAcks[plan.id] ? 'Aviso confirmado' : 'Confirmo el aviso si mi cambio incluye datos sensibles'}</Text>
              </Pressable>
              <Pressable disabled={working === plan.id} onPress={() => submitModify(plan.id)} style={[styles.modifyButton, working === plan.id && styles.disabled]}>
                <Text style={styles.modifyButtonText}>{working === plan.id ? 'Procesando...' : 'Generar version modificada'}</Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable disabled={working === plan.id} onPress={() => submitAccept(plan.id)} style={[styles.acceptButton, working === plan.id && styles.disabled]}>
                  <Text style={styles.acceptText}>Aceptar y crear rutinas</Text>
                </Pressable>
                <Pressable disabled={working === plan.id} onPress={() => submitReject(plan.id)} style={[styles.rejectButton, working === plan.id && styles.disabled]}>
                  <Text style={styles.rejectText}>Rechazar</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ZenithCard>
      ))}
    </ZenithScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: zenith.colors.muted, fontFamily: zenith.font.body, fontSize: 16, lineHeight: 23 },
  grid: { gap: 12 },
  sensitiveBox: { backgroundColor: zenith.colors.dangerSoft, borderColor: 'rgba(232,64,64,0.28)', borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  sensitiveTitle: { color: '#fecaca', fontFamily: zenith.font.bodyBold, fontSize: 16 },
  sensitiveText: { color: '#fca5a5', fontFamily: zenith.font.body, lineHeight: 20 },
  checkbox: { alignItems: 'center', borderColor: zenith.colors.border, borderRadius: 12, borderWidth: 1, padding: 12 },
  checkboxChecked: { backgroundColor: zenith.colors.primarySoft, borderColor: zenith.colors.primary },
  checkboxText: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold, textAlign: 'center' },
  section: { color: zenith.colors.foreground, fontFamily: zenith.font.display, fontSize: 24, lineHeight: 27, textTransform: 'uppercase' },
  card: { gap: 10 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardTitle: { color: zenith.colors.foreground, flex: 1, fontFamily: zenith.font.display, fontSize: 22, lineHeight: 24, textTransform: 'uppercase' },
  cardText: { color: zenith.colors.foreground, fontFamily: zenith.font.body, lineHeight: 21 },
  risk: { color: '#fca5a5', fontFamily: zenith.font.bodyBold, lineHeight: 20 },
  versionText: { color: zenith.colors.violet, fontFamily: zenith.font.bodyBold },
  providerText: { color: zenith.colors.cyan, fontFamily: zenith.font.mono, fontSize: 11 },
  questionBox: { borderColor: zenith.colors.primaryBorder, gap: 12 },
  questionTitle: { color: zenith.colors.foreground, fontFamily: zenith.font.display, fontSize: 24, lineHeight: 26, textTransform: 'uppercase' },
  questionText: { color: zenith.colors.muted, fontFamily: zenith.font.body, lineHeight: 20 },
  routineSelector: { gap: 8 },
  routineSelectorLabel: { color: zenith.colors.muted, fontFamily: zenith.font.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  routineOption: { borderColor: zenith.colors.border, borderRadius: 12, borderWidth: 1, padding: 11 },
  routineOptionSelected: { backgroundColor: zenith.colors.primary, borderColor: zenith.colors.primary },
  routineOptionText: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold },
  routineOptionTextSelected: { color: zenith.colors.primaryForeground },
  emptyInline: { color: zenith.colors.muted, fontFamily: zenith.font.body },
  answerBox: { backgroundColor: zenith.colors.background, borderRadius: 14, gap: 8, padding: 12 },
  answerTitle: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold },
  answerItem: { color: zenith.colors.foreground, fontFamily: zenith.font.body, lineHeight: 20 },
  actionItem: { color: zenith.colors.primary, fontFamily: zenith.font.bodyBold, lineHeight: 20 },
  summarySectionBox: { gap: 12 },
  sessionSummaryCard: { backgroundColor: zenith.colors.background, gap: 6, padding: 12 },
  sessionTitle: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold },
  summaryLink: { color: zenith.colors.primary, fontFamily: zenith.font.bodyBold },
  routineBox: { backgroundColor: zenith.colors.background, borderRadius: 12, gap: 4, padding: 10 },
  routineTitle: { color: zenith.colors.primary, fontFamily: zenith.font.bodyBold },
  exerciseLine: { color: zenith.colors.foreground, fontFamily: zenith.font.body, fontSize: 13, lineHeight: 19 },
  progressionText: { color: zenith.colors.amber, fontFamily: zenith.font.bodyBold, lineHeight: 20 },
  draftBox: { backgroundColor: zenith.colors.secondary, borderColor: zenith.colors.border, borderRadius: 14, borderWidth: 1, gap: 10, padding: 12 },
  modifyTitle: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold, fontSize: 15 },
  modifyText: { color: zenith.colors.muted, fontFamily: zenith.font.body, lineHeight: 20 },
  modifyButton: { alignItems: 'center', backgroundColor: zenith.colors.primary, borderRadius: 12, padding: 12 },
  modifyButtonText: { color: zenith.colors.primaryForeground, fontFamily: zenith.font.bodyBold },
  actions: { gap: 10 },
  acceptButton: { alignItems: 'center', backgroundColor: zenith.colors.primary, borderRadius: 12, padding: 12 },
  acceptText: { color: zenith.colors.primaryForeground, fontFamily: zenith.font.bodyBold },
  rejectButton: { alignItems: 'center', borderColor: zenith.colors.border, borderRadius: 12, borderWidth: 1, padding: 12 },
  rejectText: { color: zenith.colors.muted, fontFamily: zenith.font.bodyBold },
  disabled: { opacity: 0.55 },
  empty: { backgroundColor: zenith.colors.card, borderColor: zenith.colors.border, borderRadius: 16, borderWidth: 1, color: zenith.colors.muted, fontFamily: zenith.font.body, padding: 16 },
});
