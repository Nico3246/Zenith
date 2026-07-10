import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createRoutine, Exercise, getExercises } from '@/api/client';
import { ExerciseSelector } from '@/components/ExerciseSelector';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SegmentedField } from '@/components/SegmentedField';
import { buildRoutineExercises, newRoutineExerciseRow, RoutineExerciseRow } from '@/utils/routineForm';

export default function NewRoutineScreen() {
  const router = useRouter();
  const [name, setName] = useState('Rutina fuerza');
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [rows, setRows] = useState<RoutineExerciseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExercises()
      .then((items) => {
        setExercises(items);
        if (items[0]) {
          setRows([newRoutineExerciseRow(items[0].id)]);
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

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
      await createRoutine({
        name: name.trim(),
        goal: goal.trim() || null,
        description: description.trim() || null,
        exercises: result.exercises,
      });
      router.replace('/routines?notice=created');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la rutina.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Nueva rutina</Text>
      <Field label="Nombre" onChangeText={setName} value={name} />
      <Field label="Objetivo opcional" onChangeText={setGoal} value={goal} />
      <Field label="Descripcion opcional" multiline onChangeText={setDescription} value={description} />
      <Text style={styles.section}>Ejercicios planificados</Text>
      {loading && <Text style={styles.empty}>Cargando ejercicios...</Text>}
      {!loading && exercises.length === 0 && <Text style={styles.empty}>No hay ejercicios disponibles para crear la rutina.</Text>}
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
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton disabled={saving || loading || exercises.length === 0} onPress={submit} title={saving ? 'Creando...' : 'Crear rutina'} />
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
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
