import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Exercise, getExercises, getRoutines, getWorkoutSessions, Routine, WorkoutSession } from '@/api/client';
import { Screen } from '@/components/Screen';
import { formatVolumeByUnit, routineName, uniqueExerciseNames } from '@/utils/workoutDisplay';

export default function SessionsScreen() {
  const { notice } = useLocalSearchParams();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWorkoutSessions(), getRoutines(), getExercises()])
      .then(([sessionItems, routineItems, exerciseItems]) => {
        setSessions(sessionItems);
        setRoutines(routineItems);
        setExercises(exerciseItems);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  const noticeText = notice === 'created' ? 'Sesion registrada.' : notice === 'updated' ? 'Sesion guardada.' : notice === 'deleted' ? 'Sesion eliminada.' : null;

  return (
    <Screen>
      <Text style={styles.title}>Sesiones</Text>
      {noticeText && <Text style={styles.notice}>{noticeText}</Text>}
      {loading && <Text style={styles.empty}>Cargando rutinas y sesiones...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.section}>Empezar rutina</Text>
      {!loading && !error && routines.length === 0 && <Text style={styles.empty}>Aun no tienes rutinas. Crea una rutina para empezar entrenamientos guiados.</Text>}
      {routines.map((routine) => (
        <View key={routine.id} style={styles.card}>
          <Text style={styles.name}>{routine.name}</Text>
          {routine.goal && <Text style={styles.meta}>{routine.goal}</Text>}
          <Text style={styles.meta}>{routine.exercises.length} ejercicios planificados</Text>
          <Link href={{ pathname: '/session-active', params: { routineId: routine.id } }} style={styles.action}>Empezar rutina</Link>
        </View>
      ))}

      <Link href="/session-new" style={styles.secondaryAction}>Registrar sesion libre</Link>

      <Text style={styles.section}>Historial</Text>
      {!loading && !error && sessions.length === 0 && <Text style={styles.empty}>Aun no registraste sesiones.</Text>}
      {sessions.map((session) => (
        <View key={session.id} style={styles.card}>
          <Text style={styles.name}>{new Date(session.started_at).toLocaleString()}</Text>
          <Text style={styles.meta}>{routineName(session.routine_id, routines)}</Text>
          <Text style={styles.meta}>{session.sets.length} series registradas</Text>
          <Text style={styles.meta}>Volumen: {formatVolumeByUnit(session.sets)}</Text>
          <Text style={styles.exercises}>{uniqueExerciseNames(session.sets, exercises) || 'Sin ejercicios'}</Text>
          <View style={styles.actionsRow}>
            <Link href={{ pathname: '/session-detail', params: { sessionId: session.id } }} style={styles.link}>Ver detalle</Link>
            <Link href={{ pathname: '/session-edit', params: { sessionId: session.id } }} style={styles.link}>Editar</Link>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  section: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  action: { backgroundColor: '#38bdf8', borderRadius: 14, color: '#020617', fontWeight: '900', marginTop: 8, padding: 14, textAlign: 'center' },
  secondaryAction: { borderColor: '#38bdf8', borderRadius: 14, borderWidth: 1, color: '#7dd3fc', fontWeight: '900', padding: 14, textAlign: 'center' },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, gap: 8, padding: 16 },
  name: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  meta: { color: '#94a3b8' },
  exercises: { color: '#cbd5e1', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  link: { color: '#7dd3fc', fontWeight: '900' },
  notice: { backgroundColor: '#064e3b', borderRadius: 14, color: '#bbf7d0', padding: 12 },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
