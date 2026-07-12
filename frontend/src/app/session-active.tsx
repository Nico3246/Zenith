import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, SkipForward } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { createWorkoutSession, Exercise, getExercises, getRoutine, getWorkoutSessions, Routine, WorkoutSession } from '@/api/client';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedField } from '@/components/SegmentedField';
import { ZenithCard, ZenithNotice } from '@/components/ZenithUI';
import { ZenithScreen } from '@/components/ZenithScreen';
import { zenith } from '@/constants/zenithTheme';
import { buildWorkoutSets, SetRow, WeightUnit } from '@/utils/sessionForm';
import { exerciseName, formatPlannedExercise } from '@/utils/workoutDisplay';
import { progressionHintForExercise } from '@/utils/progression';

const UNIT_OPTIONS = [
  { label: 'kg', value: 'kg' },
  { label: 'lb', value: 'lb' },
];

type ActiveSetRow = SetRow & {
  plannedKey: string;
  completed: boolean;
};

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function newActiveSet(plannedKey: string, exerciseId: string, reps: string, index: number): ActiveSetRow {
  return {
    key: `${plannedKey}-${Date.now()}-${index}-${Math.random()}`,
    plannedKey,
    exercise_id: exerciseId,
    reps,
    weight_value: '',
    weight_unit: 'kg',
    rpe: '',
    rir: '',
    rest_seconds: '',
    notes: '',
    completed: false,
  };
}

function buildRowsFromRoutine(routine: Routine): ActiveSetRow[] {
  return [...routine.exercises]
    .sort((left, right) => left.position - right.position)
    .flatMap((planned) => {
      const plannedKey = planned.id ?? `${planned.exercise_id}-${planned.position}`;
      const setCount = Math.max(1, planned.target_sets ?? 1);
      return Array.from({ length: setCount }, (_, index) => ({
        ...newActiveSet(plannedKey, planned.exercise_id, planned.target_reps_min?.toString() ?? '10', index + 1),
        rpe: planned.target_rpe ?? '',
        rir: planned.target_rir?.toString() ?? '',
        rest_seconds: planned.rest_seconds?.toString() ?? '',
      }));
    });
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function ActiveSessionScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams();
  const id = paramValue(routineId);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [previousSessions, setPreviousSessions] = useState<WorkoutSession[]>([]);
  const [startedAt] = useState(new Date().toISOString());
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [rows, setRows] = useState<ActiveSetRow[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (restRemaining <= 0) {
      return;
    }
    const timer = setInterval(() => setRestRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [restRemaining]);

  /*useEffect(() => {
    if (typeof window === 'undefined' || rows.every((row) => !row.completed)) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [rows]);*/

  useEffect(() => {
  const hasCompletedRows = rows.some((row) => row.completed);

  if (
    Platform.OS !== 'web' ||
    !hasCompletedRows ||
    typeof window === 'undefined' ||
    typeof window.addEventListener !== 'function' ||
    typeof window.removeEventListener !== 'function'
  ) {
    return;
  }

  const handler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };

  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [rows]);


  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([getRoutine(id), getExercises(), getWorkoutSessions()])
      .then(([routineItem, exerciseItems, sessionItems]) => {
        setRoutine(routineItem);
        setExercises(exerciseItems);
        setPreviousSessions(sessionItems);
        setRows(buildRowsFromRoutine(routineItem));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id]);

  function updateRow(key: string, patch: Partial<ActiveSetRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addSet(plannedKey: string, exerciseId: string, reps: string) {
    setRows((current) => [...current, newActiveSet(plannedKey, exerciseId, reps || '10', current.length + 1)]);
  }

  function copyPreviousSet(row: ActiveSetRow) {
    setRows((current) => {
      const rowIndex = current.findIndex((item) => item.key === row.key);
      const previous = current
        .slice(0, rowIndex)
        .reverse()
        .find((item) => item.plannedKey === row.plannedKey);
      if (!previous) {
        return current;
      }
      return current.map((item) =>
        item.key === row.key
          ? {
              ...item,
              reps: previous.reps,
              weight_value: previous.weight_value,
              weight_unit: previous.weight_unit,
              rpe: previous.rpe,
              rir: previous.rir,
            }
          : item
      );
    });
  }

  function toggleCompleted(row: ActiveSetRow, plannedRestSeconds: number | null | undefined) {
    const nextCompleted = !row.completed;
    updateRow(row.key, { completed: nextCompleted });
    if (!nextCompleted) {
      return;
    }
    const rowRest = Number(row.rest_seconds || plannedRestSeconds || 0);
    if (!Number.isNaN(rowRest) && rowRest > 0) {
      setRestRemaining(rowRest);
    }
  }

  function cancelSession() {
    if (completedCount > 0 && !cancelConfirm) {
      setCancelConfirm(true);
      return;
    }
    router.replace('/sessions');
  }

  async function finishSession() {
    if (!routine || !id) {
      setError('Rutina no encontrada.');
      return;
    }
    const completedRows = rows.filter((row) => row.completed);
    if (completedRows.length === 0) {
      setError('Marca al menos una serie como completada antes de finalizar.');
      return;
    }

    const result = buildWorkoutSets(completedRows);
    if (result.sets === null) {
      setError(result.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createWorkoutSession({
        routine_id: id,
        started_at: startedAt,
        timezone,
        notes: `Sesion guiada desde rutina: ${routine.name}`,
        sets: result.sets,
      });
      router.replace('/sessions?notice=created');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo finalizar la sesion.');
    } finally {
      setSaving(false);
    }
  }

  const completedCount = rows.filter((row) => row.completed).length;
  const completedExerciseCount = routine
    ? routine.exercises.filter((planned) => {
        const plannedKey = planned.id ?? `${planned.exercise_id}-${planned.position}`;
        const exerciseRows = rows.filter((row) => row.plannedKey === plannedKey);
        return exerciseRows.length > 0 && exerciseRows.every((row) => row.completed);
      }).length
    : 0;

  return (
    <ZenithScreen>
      {loading && <ZenithNotice>Cargando rutina...</ZenithNotice>}
      {!id && <ZenithNotice tone="danger">Rutina no encontrada.</ZenithNotice>}
      {routine && (
        <ZenithCard style={styles.headerCard}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En sesion</Text>
          </View>
          <View style={styles.headerMain}>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.routineName}>{routine.name}</Text>
              {routine.goal && <Text style={styles.meta}>{routine.goal}</Text>}
            </View>
            <View style={styles.timerBlock}>
              <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
              <Text style={styles.timerLabel}>duracion</Text>
            </View>
          </View>
          {routine.goal && <Text style={styles.meta}>{routine.goal}</Text>}
          <Text style={styles.meta}>Inicio: {new Date(startedAt).toLocaleTimeString()}</Text>
          <Text style={styles.meta}>Ejercicios: {completedExerciseCount}/{routine.exercises.length} | Series: {completedCount}/{rows.length}</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${rows.length > 0 ? (completedCount / rows.length) * 100 : 0}%` }]} /></View>
          {restRemaining > 0 && (
            <View style={styles.restBox}>
              <Text style={styles.restTimer}>{formatDuration(restRemaining)}</Text>
              <Text style={styles.restLabel}>Descanso activo</Text>
              <Pressable onPress={() => setRestRemaining(0)} style={styles.skipRest}><SkipForward color={zenith.colors.muted} size={12} /><Text style={styles.skipRestText}>Saltar</Text></Pressable>
            </View>
          )}
        </ZenithCard>
      )}
      {error && <ZenithNotice tone="danger">{error}</ZenithNotice>}

      {routine && [...routine.exercises]
        .sort((left, right) => left.position - right.position)
        .map((planned) => {
          const plannedKey = planned.id ?? `${planned.exercise_id}-${planned.position}`;
          const exerciseRows = rows.filter((row) => row.plannedKey === plannedKey);
          const exerciseCompleted = exerciseRows.length > 0 && exerciseRows.every((row) => row.completed);
          const hint = progressionHintForExercise(planned, previousSessions);
          return (
            <ZenithCard key={plannedKey} style={exerciseCompleted ? [styles.exerciseCard, styles.exerciseCompletedCard] : styles.exerciseCard}>
              <Text style={styles.exerciseTitle}>{planned.position}. {exerciseName(planned.exercise_id, exercises)}</Text>
              {exerciseCompleted && <Text style={styles.completedLabel}>Ejercicio completo</Text>}
              <Text style={styles.meta}>{formatPlannedExercise(planned)}</Text>
              <View style={styles.hintCard}>
                <Text style={styles.hintTitle}>Siguiente paso</Text>
                <Text style={styles.hintText}>{hint.lastSummary}</Text>
                <Text style={styles.hintText}>{hint.recommendation}</Text>
              </View>
              {planned.notes && <Text style={styles.notes}>{planned.notes}</Text>}
              {exerciseRows.map((row, index) => (
                <View key={row.key} style={[styles.setCard, row.completed && styles.completedCard]}>
                  <Text style={styles.setTitle}>Serie {index + 1}</Text>
                  <View style={styles.grid}>
                    <Field keyboardType="numeric" label="Reps" onChangeText={(reps) => updateRow(row.key, { reps })} value={row.reps} />
                    <Field keyboardType="decimal-pad" label="Peso" onChangeText={(weight_value) => updateRow(row.key, { weight_value })} value={row.weight_value} />
                    <SegmentedField
                      label="Unidad"
                      onValueChange={(weight_unit) => updateRow(row.key, { weight_unit: weight_unit as WeightUnit })}
                      options={UNIT_OPTIONS}
                      selectedValue={row.weight_unit}
                    />
                    <Field keyboardType="decimal-pad" label="RPE" onChangeText={(rpe) => updateRow(row.key, { rpe })} value={row.rpe} />
                    <Field keyboardType="numeric" label="RIR" onChangeText={(rir) => updateRow(row.key, { rir })} value={row.rir} />
                  </View>
                  <View style={styles.setActions}>
                    <Pressable onPress={() => copyPreviousSet(row)} style={styles.copyButton}>
                      <Text style={styles.copyText}>Copiar anterior</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => toggleCompleted(row, planned.rest_seconds)} style={[styles.completeButton, row.completed && styles.completedButton]}>
                    {row.completed && <Check color={zenith.colors.primaryForeground} size={13} />}
                    <Text style={[styles.completeText, row.completed && styles.completedText]}>{row.completed ? 'Completada' : 'Marcar completada'}</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => addSet(plannedKey, planned.exercise_id, planned.target_reps_min?.toString() ?? '10')} style={styles.addSetButton}>
                <Text style={styles.addSetText}>Anadir serie extra</Text>
              </Pressable>
            </ZenithCard>
          );
        })}

      <PrimaryButton disabled={saving || loading || completedCount === 0} onPress={finishSession} title={saving ? 'Guardando...' : 'Finalizar sesion'} />
      <Pressable onPress={cancelSession} style={styles.cancelButton}>
        <Text style={styles.cancelText}>{cancelConfirm ? 'Pulsar otra vez para salir sin guardar' : 'Salir sin guardar'}</Text>
      </Pressable>
    </ZenithScreen>
  );
}

const styles = StyleSheet.create({
  headerCard: { borderColor: zenith.colors.primaryBorder, gap: 10 },
  liveRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  liveDot: { backgroundColor: zenith.colors.primary, borderRadius: 999, height: 7, width: 7 },
  liveText: { color: zenith.colors.primary, fontFamily: zenith.font.mono, fontSize: 10, textTransform: 'uppercase' },
  headerMain: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  headerTitleBlock: { flex: 1 },
  routineName: { color: zenith.colors.foreground, fontFamily: zenith.font.display, fontSize: 30, lineHeight: 32, textTransform: 'uppercase' },
  timerBlock: { alignItems: 'flex-end' },
  timer: { color: zenith.colors.primary, fontFamily: zenith.font.display, fontSize: 32, lineHeight: 34 },
  timerLabel: { color: zenith.colors.muted, fontFamily: zenith.font.mono, fontSize: 10 },
  progressTrack: { backgroundColor: zenith.colors.secondary, borderRadius: 999, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: zenith.colors.primary, borderRadius: 999, height: '100%' },
  restBox: { alignItems: 'center', backgroundColor: zenith.colors.primarySoft, borderColor: zenith.colors.primaryBorder, borderRadius: 18, borderWidth: 1, gap: 4, padding: 14 },
  restTimer: { color: zenith.colors.primary, fontFamily: zenith.font.display, fontSize: 46, lineHeight: 48 },
  restLabel: { color: zenith.colors.muted, fontFamily: zenith.font.mono, fontSize: 10, textTransform: 'uppercase' },
  skipRest: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 4 },
  skipRestText: { color: zenith.colors.muted, fontFamily: zenith.font.bodyMedium, fontSize: 12 },
  exerciseCard: { gap: 12 },
  exerciseCompletedCard: { borderColor: zenith.colors.cyan },
  exerciseTitle: { color: zenith.colors.foreground, fontFamily: zenith.font.display, fontSize: 25, lineHeight: 27, textTransform: 'uppercase' },
  completedLabel: { color: zenith.colors.cyan, fontFamily: zenith.font.bodyBold },
  hintCard: { backgroundColor: zenith.colors.primarySoft, borderColor: zenith.colors.primaryBorder, borderRadius: 12, borderWidth: 1, gap: 4, padding: 10 },
  hintTitle: { color: zenith.colors.primary, fontFamily: zenith.font.mono, fontSize: 10, textTransform: 'uppercase' },
  hintText: { color: zenith.colors.foreground, fontFamily: zenith.font.body, fontSize: 12, lineHeight: 18 },
  setCard: { backgroundColor: zenith.colors.background, borderColor: zenith.colors.border, borderRadius: 14, borderWidth: 1, gap: 10, padding: 12 },
  completedCard: { borderColor: zenith.colors.cyan },
  setTitle: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold },
  grid: { gap: 10 },
  setActions: { flexDirection: 'row', gap: 10 },
  meta: { color: zenith.colors.muted, fontFamily: zenith.font.body },
  notes: { color: zenith.colors.foreground, fontFamily: zenith.font.body, fontStyle: 'italic' },
  copyButton: { alignItems: 'center', borderColor: zenith.colors.border, borderRadius: 12, borderWidth: 1, flex: 1, padding: 10 },
  copyText: { color: zenith.colors.muted, fontFamily: zenith.font.bodyBold },
  completeButton: { alignItems: 'center', borderColor: zenith.colors.primaryBorder, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', padding: 12 },
  completedButton: { backgroundColor: zenith.colors.primary, borderColor: zenith.colors.primary },
  completeText: { color: zenith.colors.primary, fontFamily: zenith.font.bodyBold },
  completedText: { color: zenith.colors.primaryForeground },
  addSetButton: { alignItems: 'center', borderColor: zenith.colors.primaryBorder, borderRadius: 12, borderWidth: 1, padding: 12 },
  addSetText: { color: zenith.colors.primary, fontFamily: zenith.font.bodyBold },
  cancelButton: { alignItems: 'center', borderColor: 'rgba(232,64,64,0.35)', borderRadius: 14, borderWidth: 1, padding: 14 },
  cancelText: { color: '#fca5a5', fontFamily: zenith.font.bodyBold },
});
