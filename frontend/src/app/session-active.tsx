import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
//import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { createWorkoutSession, Exercise, getExercises, getRoutine, getWorkoutSessions, Routine, WorkoutSession } from '@/api/client';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SegmentedField } from '@/components/SegmentedField';
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
    <Screen>
      <Text style={styles.title}>Sesion activa</Text>
      {loading && <Text style={styles.empty}>Cargando rutina...</Text>}
      {!id && <Text style={styles.error}>Rutina no encontrada.</Text>}
      {routine && (
        <View style={styles.headerCard}>
          <Text style={styles.routineName}>{routine.name}</Text>
          {routine.goal && <Text style={styles.meta}>{routine.goal}</Text>}
          <Text style={styles.meta}>Tiempo: {formatDuration(elapsedSeconds)} · Inicio: {new Date(startedAt).toLocaleTimeString()}</Text>
          <Text style={styles.meta}>Ejercicios: {completedExerciseCount}/{routine.exercises.length} · Series: {completedCount}/{rows.length}</Text>
          {restRemaining > 0 && <Text style={styles.restTimer}>Descanso: {formatDuration(restRemaining)}</Text>}
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {routine && [...routine.exercises]
        .sort((left, right) => left.position - right.position)
        .map((planned) => {
          const plannedKey = planned.id ?? `${planned.exercise_id}-${planned.position}`;
          const exerciseRows = rows.filter((row) => row.plannedKey === plannedKey);
          const exerciseCompleted = exerciseRows.length > 0 && exerciseRows.every((row) => row.completed);
          const hint = progressionHintForExercise(planned, previousSessions);
          return (
            <View key={plannedKey} style={[styles.exerciseCard, exerciseCompleted && styles.exerciseCompletedCard]}>
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
                    <Text style={[styles.completeText, row.completed && styles.completedText]}>{row.completed ? 'Completada' : 'Marcar completada'}</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => addSet(plannedKey, planned.exercise_id, planned.target_reps_min?.toString() ?? '10')} style={styles.addSetButton}>
                <Text style={styles.addSetText}>Anadir serie extra</Text>
              </Pressable>
            </View>
          );
        })}

      <PrimaryButton disabled={saving || loading || completedCount === 0} onPress={finishSession} title={saving ? 'Guardando...' : 'Finalizar sesion'} />
      <Pressable onPress={cancelSession} style={styles.cancelButton}>
        <Text style={styles.cancelText}>{cancelConfirm ? 'Pulsar otra vez para salir sin guardar' : 'Salir sin guardar'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  headerCard: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, gap: 6, padding: 16 },
  routineName: { color: '#f8fafc', fontSize: 22, fontWeight: '900' },
  exerciseCard: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, gap: 12, padding: 16 },
  exerciseCompletedCard: { borderColor: '#22c55e' },
  exerciseTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  completedLabel: { color: '#86efac', fontWeight: '900' },
  restTimer: { color: '#facc15', fontSize: 18, fontWeight: '900' },
  hintCard: { backgroundColor: '#082f49', borderRadius: 12, gap: 4, padding: 10 },
  hintTitle: { color: '#bae6fd', fontWeight: '900' },
  hintText: { color: '#e0f2fe' },
  setCard: { backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: 14, borderWidth: 1, gap: 10, padding: 12 },
  completedCard: { borderColor: '#22c55e' },
  setTitle: { color: '#f8fafc', fontWeight: '900' },
  grid: { gap: 10 },
  setActions: { flexDirection: 'row', gap: 10 },
  meta: { color: '#94a3b8' },
  notes: { color: '#cbd5e1', fontStyle: 'italic' },
  copyButton: { alignItems: 'center', borderColor: '#64748b', borderRadius: 12, borderWidth: 1, flex: 1, padding: 10 },
  copyText: { color: '#cbd5e1', fontWeight: '800' },
  completeButton: { alignItems: 'center', borderColor: '#38bdf8', borderRadius: 12, borderWidth: 1, padding: 12 },
  completedButton: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  completeText: { color: '#7dd3fc', fontWeight: '900' },
  completedText: { color: '#052e16' },
  addSetButton: { alignItems: 'center', borderColor: '#38bdf8', borderRadius: 12, borderWidth: 1, padding: 12 },
  addSetText: { color: '#7dd3fc', fontWeight: '900' },
  cancelButton: { alignItems: 'center', borderColor: '#ef4444', borderRadius: 14, borderWidth: 1, padding: 14 },
  cancelText: { color: '#fca5a5', fontWeight: '900' },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
