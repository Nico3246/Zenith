import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteRoutine, Exercise, getExercises, getRoutine, updateRoutine } from '@/api/client';
import { ExerciseSelector } from '@/components/ExerciseSelector';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SegmentedField } from '@/components/SegmentedField';
import {
  buildRoutineExercises,
  newRoutineExerciseRow,
  routineExerciseToRow,
  RoutineExerciseRow,
} from '@/utils/routineForm';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function EditRoutineScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams();
  const id = paramValue(routineId);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [rows, setRows] = useState<RoutineExerciseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([getExercises(), getRoutine(id)])
      .then(([exerciseItems, routine]) => {
        setExercises(exerciseItems);
        setName(routine.name);
        setGoal(routine.goal ?? '');
        setDescription(routine.description ?? '');
        setRows(routine.exercises.map(routineExerciseToRow));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id]);

  function updateRow(key: string, patch: Partial<RoutineExerciseRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const exerciseId = exercises[0]?.id;
    if (exerciseId) {
      setRows((current) => [...current, newRoutineExerciseRow(exerciseId)]);
    }
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  async function submit() {
    if (!id) {
      setError('Rutina no encontrada.');
      return;
    }
    if (!name.trim()) {
      setError('El nombre de la rutina es obligatorio.');
      return;
    }
    const result = buildRoutineExercises(rows);
    if (result.exercises === null) {
      setError(result.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRoutine(id, {
        name: name.trim(),
        goal: goal.trim() || null,
        description: description.trim() || null,
        exercises: result.exercises,
      });
      router.replace('/routines?notice=updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la rutina.');
    } finally {
      setSaving(false);
    }
  }

  async function submitDelete() {
    if (!id) {
      setError('Rutina no encontrada.');
      return;
    }
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteRoutine(id);
      router.replace('/routines?notice=deleted');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo eliminar la rutina.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Editar rutina</Text>
      {loading && <Text style={styles.empty}>Cargando rutina...</Text>}
      <Field label="Nombre" onChangeText={setName} value={name} />
      <Field label="Objetivo opcional" onChangeText={setGoal} value={goal} />
      <Field label="Descripcion opcional" multiline onChangeText={setDescription} value={description} />
      <Text style={styles.section}>Ejercicios planificados</Text>
      {rows.map((row, index) => (
        <View key={row.key} style={styles.card}>
          <Text style={styles.cardTitle}>Ejercicio {index + 1}</Text>
          <ExerciseSelector
            exercises={exercises}
            label="Ejercicio"
            onSelect={(exercise_id) => updateRow(row.key, { exercise_id })}
            selectedExerciseId={row.exercise_id}
          />
          <View style={styles.grid}>
            <Field keyboardType="numeric" label="Series" onChangeText={(target_sets) => updateRow(row.key, { target_sets })} value={row.target_sets} />
            <Field keyboardType="numeric" label="Reps min" onChangeText={(target_reps_min) => updateRow(row.key, { target_reps_min })} value={row.target_reps_min} />
            <Field keyboardType="numeric" label="Reps max" onChangeText={(target_reps_max) => updateRow(row.key, { target_reps_max })} value={row.target_reps_max} />
            <Field keyboardType="decimal-pad" label="Peso objetivo" onChangeText={(target_weight_value) => updateRow(row.key, { target_weight_value })} value={row.target_weight_value} />
            <SegmentedField
              label="Unidad objetivo"
              onValueChange={(target_weight_unit) => updateRow(row.key, { target_weight_unit: target_weight_unit as 'kg' | 'lb' })}
              options={[{ label: 'kg', value: 'kg' }, { label: 'lb', value: 'lb' }]}
              selectedValue={row.target_weight_unit}
            />
            <Field keyboardType="decimal-pad" label="RPE objetivo" onChangeText={(target_rpe) => updateRow(row.key, { target_rpe })} value={row.target_rpe} />
            <Field keyboardType="numeric" label="RIR objetivo" onChangeText={(target_rir) => updateRow(row.key, { target_rir })} value={row.target_rir} />
            <Field keyboardType="numeric" label="Descanso seg" onChangeText={(rest_seconds) => updateRow(row.key, { rest_seconds })} value={row.rest_seconds} />
          </View>
          <Field label="Notas ejercicio" multiline onChangeText={(notes) => updateRow(row.key, { notes })} value={row.notes} />
          {rows.length > 1 && (
            <Pressable onPress={() => removeRow(row.key)} style={styles.removeButton}>
              <Text style={styles.removeText}>Quitar ejercicio</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={addRow} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Anadir ejercicio</Text>
      </Pressable>
      {!id && <Text style={styles.error}>Rutina no encontrada.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton disabled={saving || deleting || loading || exercises.length === 0} onPress={submit} title={saving ? 'Guardando...' : 'Guardar rutina'} />
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Eliminar rutina</Text>
        <Text style={styles.dangerText}>La rutina se ocultara, pero las sesiones historicas asociadas se conservaran.</Text>
        {deleteConfirm && <Text style={styles.dangerText}>Pulsa otra vez para confirmar.</Text>}
        <Pressable disabled={deleting} onPress={submitDelete} style={[styles.deleteButton, deleting && styles.disabled]}>
          <Text style={styles.deleteText}>{deleting ? 'Eliminando...' : 'Eliminar rutina'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  section: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, gap: 12, padding: 14 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  grid: { gap: 12 },
  secondaryButton: { alignItems: 'center', borderColor: '#38bdf8', borderRadius: 14, borderWidth: 1, padding: 14 },
  secondaryText: { color: '#7dd3fc', fontWeight: '900' },
  removeButton: { alignItems: 'center', borderColor: '#ef4444', borderRadius: 12, borderWidth: 1, padding: 10 },
  removeText: { color: '#fca5a5', fontWeight: '800' },
  dangerZone: { backgroundColor: '#1f1111', borderColor: '#7f1d1d', borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  dangerTitle: { color: '#fecaca', fontSize: 16, fontWeight: '900' },
  dangerText: { color: '#fca5a5' },
  deleteButton: { alignItems: 'center', backgroundColor: '#dc2626', borderRadius: 12, padding: 12 },
  deleteText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
