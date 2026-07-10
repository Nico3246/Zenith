import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Exercise, getExercises } from '@/api/client';
import { Screen } from '@/components/Screen';

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExercises()
      .then(setExercises)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Ejercicios</Text>
      {loading && <Text style={styles.empty}>Cargando ejercicios...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && exercises.length === 0 && (
        <Text style={styles.empty}>No hay ejercicios disponibles. Ejecuta seeds o crea ejercicios propios.</Text>
      )}
      {exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.meta}>{exercise.is_global ? 'Global' : 'Propio'} · {exercise.difficulty ?? 'sin dificultad'}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  name: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: '#94a3b8',
    marginTop: 4,
  },
  empty: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    color: '#cbd5e1',
    padding: 16,
  },
  error: {
    color: '#f87171',
  },
});
