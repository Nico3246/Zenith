import { Link, useLocalSearchParams } from 'expo-router';
import { Bot, Play, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { analyzeRoutineGoal, Exercise, getExercises, getRoutines, Routine } from '@/api/client';
import { ZenithBottomNav, ZenithCard, ZenithHeader, ZenithIconButton, ZenithNotice, ZenithPill } from '@/components/ZenithUI';
import { ZenithScreen } from '@/components/ZenithScreen';
import { routineAccents, zenith } from '@/constants/zenithTheme';
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
    <ZenithScreen bottomNav={<ZenithBottomNav />}>
      <ZenithHeader
        subtitle={`${routines.length} planes activos`}
        title="Rutinas"
        right={<ZenithIconButton href="/routine-new"><Plus color={zenith.colors.primary} size={17} /></ZenithIconButton>}
      />
      {noticeText && <ZenithNotice tone="success">{noticeText}</ZenithNotice>}
      {actionNotice && <ZenithNotice tone="success">{actionNotice}</ZenithNotice>}
      {loading && <ZenithNotice>Cargando rutinas...</ZenithNotice>}
      {error && <ZenithNotice tone="danger">{error}</ZenithNotice>}
      {!loading && !error && routines.length === 0 && <ZenithNotice>Aun no tienes rutinas.</ZenithNotice>}

      {routines.map((routine, index) => {
        const accent = routineAccents[index % routineAccents.length];
        return (
          <ZenithCard key={routine.id} style={[styles.card, { borderLeftColor: accent }]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleBlock}>
                <Text style={styles.name}>{routine.name}</Text>
                <Text style={styles.goal}>{routine.goal ?? 'Sin objetivo definido'}</Text>
              </View>
              <ZenithPill color={accent}>{routine.exercises.length} ej.</ZenithPill>
            </View>

            <View style={styles.exerciseList}>
              {routine.exercises.slice(0, 5).map((planned) => (
                <View key={planned.id ?? `${planned.exercise_id}-${planned.position}`} style={styles.exerciseRow}>
                  <View style={[styles.dot, { backgroundColor: accent }]} />
                  <Text style={styles.exerciseName}>{exerciseName(planned.exercise_id, exercises)}</Text>
                  <Text style={styles.exerciseMeta}>{formatPlannedExercise(planned)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <Link href={{ pathname: '/session-active', params: { routineId: routine.id } }} asChild>
                <Pressable style={[styles.startButton, { backgroundColor: accent }]}>
                  <Play color={zenith.colors.primaryForeground} fill={zenith.colors.primaryForeground} size={13} />
                  <Text style={styles.startText}>Iniciar</Text>
                </Pressable>
              </Link>
              <Pressable disabled={workingRoutine === routine.id} onPress={() => submitAnalyzeGoal(routine.id)} style={[styles.aiButton, workingRoutine === routine.id && styles.disabled]}>
                <Bot color={zenith.colors.primary} size={13} />
                <Text style={styles.aiText}>{workingRoutine === routine.id ? 'Analizando...' : 'IA'}</Text>
              </Pressable>
              <Link href={{ pathname: '/routine-edit', params: { routineId: routine.id } }} style={styles.edit}>Editar</Link>
            </View>
          </ZenithCard>
        );
      })}
      <Link href="/routine-new" asChild>
        <Pressable style={styles.createButton}>
          <Plus color={zenith.colors.primaryForeground} size={16} />
          <Text style={styles.createText}>Crear rutina</Text>
        </Pressable>
      </Link>
    </ZenithScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderLeftWidth: 3, gap: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  titleBlock: { flex: 1, gap: 2 },
  name: { color: zenith.colors.foreground, fontFamily: zenith.font.display, fontSize: 28, lineHeight: 30, textTransform: 'uppercase' },
  goal: { color: zenith.colors.muted, fontFamily: zenith.font.body, fontSize: 12 },
  exerciseList: { gap: 8 },
  exerciseRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  dot: { borderRadius: 999, height: 5, width: 5 },
  exerciseName: { color: zenith.colors.foreground, flex: 1, fontFamily: zenith.font.bodyMedium, fontSize: 13 },
  exerciseMeta: { color: zenith.colors.muted, fontFamily: zenith.font.mono, fontSize: 10 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  startButton: { alignItems: 'center', borderRadius: 13, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', padding: 11 },
  startText: { color: zenith.colors.primaryForeground, fontFamily: zenith.font.bodyBold, fontSize: 13 },
  aiButton: { alignItems: 'center', borderColor: zenith.colors.primaryBorder, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 13, paddingVertical: 10 },
  aiText: { color: zenith.colors.primary, fontFamily: zenith.font.bodyBold, fontSize: 12 },
  edit: { borderColor: zenith.colors.border, borderRadius: 13, borderWidth: 1, color: zenith.colors.muted, fontFamily: zenith.font.bodyBold, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10 },
  disabled: { opacity: 0.5 },
  createButton: { alignItems: 'center', backgroundColor: zenith.colors.primary, borderRadius: 18, flexDirection: 'row', gap: 8, justifyContent: 'center', padding: 15 },
  createText: { color: zenith.colors.primaryForeground, fontFamily: zenith.font.bodyBold, fontWeight: '900' },
});
