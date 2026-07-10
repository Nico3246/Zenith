import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createWorkoutSession, Exercise, getExercises, getRoutines, Routine } from '@/api/client';
import { Field } from '@/components/Field';
import { PickerField } from '@/components/PickerField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SegmentedField } from '@/components/SegmentedField';
import { buildWorkoutSets, duplicateSetRow, newSetRow, rowsFromRoutine, SetRow, WeightUnit } from '@/utils/sessionForm';

const UNIT_OPTIONS = [
  { label: 'kg', value: 'kg' },
  { label: 'lb', value: 'lb' },
];

export default function NewSessionScreen() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineId, setRoutineId] = useState('');
  const [startedAt, setStartedAt] = useState(new Date().toISOString());
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<SetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getExercises(), getRoutines()])
      .then(([exerciseItems, routineItems]) => {
        setExercises(exerciseItems);
        setRoutines(routineItems);
        if (exerciseItems[0]) {
          setRows([newSetRow(exerciseItems[0].id)]);
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  function updateRow(key: string, patch: Partial<SetRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const exerciseId = exercises[0]?.id;
    if (exerciseId) {
      setRows((current) => [...current, newSetRow(exerciseId)]);
    }
  }

  function duplicateRow(row: SetRow) {
    setRows((current) => {
      const index = current.findIndex((item) => item.key === row.key);
      if (index === -1) {
        return current;
      }
      return [...current.slice(0, index + 1), duplicateSetRow(row), ...current.slice(index + 1)];
    });
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function handleRoutineChange(nextRoutineId: string) {
    setRoutineId(nextRoutineId);
    const routine = routines.find((item) => item.id === nextRoutineId);
    if (!routine) {
      return;
    }
    const routineRows = rowsFromRoutine(routine);
    setRows(routineRows.length > 0 ? routineRows : exercises[0] ? [newSetRow(exercises[0].id)] : []);
  }

  async function submit() {
    if (!startedAt.trim()) {
      setError('La fecha de inicio es obligatoria.');
      return;
    }
    if (!timezone.trim()) {
      setError('La zona horaria es obligatoria.');
      return;
    }

    const result = buildWorkoutSets(rows);
    if (result.sets === null) {
      setError(result.error);
      return;
    }
    if (result.sets.length === 0) {
      setError('Necesitas series validas para guardar la sesion.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createWorkoutSession({
        routine_id: routineId || null,
        started_at: startedAt,
        timezone,
        notes: notes.trim() || null,
        sets: result.sets,
      });
      router.replace('/sessions?notice=created');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo registrar la sesion.');
    } finally {
      setSaving(false);
    }
  }

  const exerciseOptions = exercises.map((exercise) => ({ label: exercise.name, value: exercise.id }));
  const routineOptions = [{ label: 'Sin rutina', value: '' }, ...routines.map((routine) => ({ label: routine.name, value: routine.id }))];

  return (
    <Screen>
      <Text style={styles.title}>Registrar sesion</Text>
      <PickerField label="Rutina opcional" onValueChange={handleRoutineChange} options={routineOptions} selectedValue={routineId} />
      <Field label="Inicio ISO" onChangeText={setStartedAt} value={startedAt} />
      <Field label="Zona horaria" onChangeText={setTimezone} value={timezone} />
      <Field label="Notas opcionales" multiline onChangeText={setNotes} value={notes} />
      <Text style={styles.section}>Series</Text>
      {loading && <Text style={styles.empty}>Cargando ejercicios y rutinas...</Text>}
      {!loading && exercises.length === 0 && <Text style={styles.empty}>No hay ejercicios disponibles para registrar una sesion.</Text>}
      {rows.map((row, index) => (
        <View key={row.key} style={styles.card}>
          <Text style={styles.cardTitle}>Serie {index + 1}</Text>
          <PickerField
            label="Ejercicio"
            onValueChange={(exercise_id) => updateRow(row.key, { exercise_id })}
            options={exerciseOptions}
            selectedValue={row.exercise_id}
          />
          <View style={styles.grid}>
            <Field keyboardType="numeric" label="Reps" onChangeText={(reps) => updateRow(row.key, { reps })} value={row.reps} />
            <Field keyboardType="decimal-pad" label="Peso opcional" onChangeText={(weight_value) => updateRow(row.key, { weight_value })} value={row.weight_value} />
            <SegmentedField
              label="Unidad"
              onValueChange={(weight_unit) => updateRow(row.key, { weight_unit: weight_unit as WeightUnit })}
              options={UNIT_OPTIONS}
              selectedValue={row.weight_unit}
            />
            <Field keyboardType="decimal-pad" label="RPE opcional" onChangeText={(rpe) => updateRow(row.key, { rpe })} value={row.rpe} />
            <Field keyboardType="numeric" label="RIR opcional" onChangeText={(rir) => updateRow(row.key, { rir })} value={row.rir} />
            <Field keyboardType="numeric" label="Descanso seg opcional" onChangeText={(rest_seconds) => updateRow(row.key, { rest_seconds })} value={row.rest_seconds} />
          </View>
          <Field label="Notas serie opcionales" multiline onChangeText={(setNotesValue) => updateRow(row.key, { notes: setNotesValue })} value={row.notes} />
          <View style={styles.actionsRow}>
            <Pressable onPress={() => duplicateRow(row)} style={styles.secondarySmallButton}>
              <Text style={styles.secondaryText}>Duplicar</Text>
            </Pressable>
            {rows.length > 1 && (
              <Pressable onPress={() => removeRow(row.key)} style={styles.removeSmallButton}>
                <Text style={styles.removeText}>Quitar</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
      <Pressable onPress={addRow} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Anadir serie</Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton disabled={saving || loading || exercises.length === 0} onPress={submit} title={saving ? 'Guardando...' : 'Guardar sesion'} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  section: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, gap: 12, padding: 14 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  grid: { gap: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: { alignItems: 'center', borderColor: '#38bdf8', borderRadius: 14, borderWidth: 1, padding: 14 },
  secondarySmallButton: { alignItems: 'center', borderColor: '#38bdf8', borderRadius: 12, borderWidth: 1, flex: 1, padding: 10 },
  secondaryText: { color: '#7dd3fc', fontWeight: '900' },
  removeSmallButton: { alignItems: 'center', borderColor: '#ef4444', borderRadius: 12, borderWidth: 1, flex: 1, padding: 10 },
  removeText: { color: '#fca5a5', fontWeight: '800' },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
