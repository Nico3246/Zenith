import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { analyzeRoutineGoal, Exercise, getExercises, getRoutines, Routine } from '@/api/client';
import { Screen } from '@/components/Screen';
import { exerciseName, formatPlannedExercise } from '@/utils/workoutDisplay';

export default function RoutinesScreen() {
  const { notice } = useLocalSearchParams();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingRoutine, setWorkingRoutine] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getRoutines(), getExercises()])
      .then(([routineItems, exerciseItems]) => {
        setRoutines(routineItems);
        setExercises(exerciseItems);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  const noticeText = notice === 'created' ? 'Rutina creada.' : notice === 'updated' ? 'Rutina guardada.' : notice === 'deleted' ? 'Rutina eliminada.' : null;

  async function submitAnalyzeGoal(routineId: string) {
    setWorkingRoutine(routineId);
    setError(null);
    setActionNotice(null);
    try {
      const suggestions = await analyzeRoutineGoal(routineId);
      setActionNotice(
        suggestions.length > 0
          ? `Se generaron ${suggestions.length} ajustes de objetivo. Revisalos en Entrenador IA.`
          : 'La rutina ya esta alineada con su objetivo o no tiene objetivo reconocido.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo analizar el objetivo de la rutina.');
    } finally {
      setWorkingRoutine(null);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Rutinas</Text>
      <Link href="/routine-new" style={styles.action}>Crear rutina</Link>
      {noticeText && <Text style={styles.notice}>{noticeText}</Text>}
      {actionNotice && <Text style={styles.notice}>{actionNotice}</Text>}
      {loading && <Text style={styles.empty}>Cargando rutinas...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && routines.length === 0 && <Text style={styles.empty}>Aun no tienes rutinas.</Text>}
      {routines.map((routine) => (
        <View key={routine.id} style={styles.card}>
          <Text style={styles.name}>{routine.name}</Text>
          {routine.goal && <Text style={styles.goal}>{routine.goal}</Text>}
          <Text style={styles.meta}>{routine.exercises.length} ejercicios planificados</Text>
          {routine.exercises.map((exercise) => (
            <View key={exercise.id ?? `${exercise.exercise_id}-${exercise.position}`} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{exercise.position}. {exerciseName(exercise.exercise_id, exercises)}</Text>
              <Text style={styles.exerciseMeta}>{formatPlannedExercise(exercise)}</Text>
              {exercise.notes && <Text style={styles.notes}>{exercise.notes}</Text>}
            </View>
          ))}
          <Pressable disabled={workingRoutine === routine.id} onPress={() => submitAnalyzeGoal(routine.id)} style={[styles.aiButton, workingRoutine === routine.id && styles.disabled]}>
            <Text style={styles.aiButtonText}>{workingRoutine === routine.id ? 'Analizando...' : 'Analizar objetivo IA'}</Text>
          </Pressable>
          <Link href={{ pathname: '/routine-edit', params: { routineId: routine.id } }} style={styles.edit}>Editar</Link>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  action: { backgroundColor: '#38bdf8', borderRadius: 14, color: '#020617', fontWeight: '900', padding: 14, textAlign: 'center' },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, gap: 10, padding: 16 },
  name: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  goal: { color: '#7dd3fc', fontWeight: '700' },
  meta: { color: '#94a3b8' },
  exerciseRow: { backgroundColor: '#020617', borderRadius: 12, gap: 4, padding: 10 },
  exerciseName: { color: '#f8fafc', fontWeight: '800' },
  exerciseMeta: { color: '#cbd5e1' },
  notes: { color: '#94a3b8', fontStyle: 'italic' },
  aiButton: { alignItems: 'center', backgroundColor: '#a78bfa', borderRadius: 12, padding: 12 },
  aiButtonText: { color: '#1e1b4b', fontWeight: '900' },
  edit: { color: '#7dd3fc', fontWeight: '900', marginTop: 4 },
  disabled: { opacity: 0.55 },
  notice: { backgroundColor: '#064e3b', borderRadius: 14, color: '#bbf7d0', padding: 12 },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
