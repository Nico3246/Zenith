import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AiSessionSummary,
  deleteWorkoutSession,
  Exercise,
  generateSessionSummary,
  getExercises,
  getRoutines,
  getSessionSummary,
  getWorkoutSession,
  Routine,
  WorkoutSession,
} from '@/api/client';
import { Screen } from '@/components/Screen';
import { exerciseName, formatVolumeByUnit, routineName } from '@/utils/workoutDisplay';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatWeight(weightValue: string | null | undefined, weightUnit: string | null | undefined) {
  if (!weightValue || !weightUnit) {
    return 'sin peso';
  }
  return `${weightValue} ${weightUnit}`;
}

function providerSummary(summary: AiSessionSummary) {
  const model = summary.model ? ` · ${summary.model}` : '';
  const fallback = summary.fallback_used ? ' · fallback interno' : '';
  return `${summary.provider}${model}${fallback}`;
}

function SummaryList({ items, title, variant }: { items: string[]; title: string; variant?: 'warning' }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.summaryGroup}>
      <Text style={styles.summaryGroupTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={variant === 'warning' ? styles.warningItem : styles.summaryItem}>- {item}</Text>
      ))}
    </View>
  );
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const id = paramValue(sessionId);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [summary, setSummary] = useState<AiSessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(Boolean(id));
  const [summarySaving, setSummarySaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([getWorkoutSession(id), getRoutines(), getExercises()])
      .then(([sessionItem, routineItems, exerciseItems]) => {
        setSession(sessionItem);
        setRoutines(routineItems);
        setExercises(exerciseItems);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
    getSessionSummary(id)
      .then(setSummary)
      .catch((caught) => {
        if (!(caught instanceof Error) || !caught.message.includes('Session summary not found')) {
          setError(caught instanceof Error ? caught.message : 'No se pudo cargar el resumen IA.');
        }
      })
      .finally(() => setSummaryLoading(false));
  }, [id]);

  async function submitGenerateSummary() {
    if (!id) {
      setError('Sesion no encontrada.');
      return;
    }
    setSummarySaving(true);
    setError(null);
    try {
      setSummary(await generateSessionSummary(id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo generar el resumen IA.');
    } finally {
      setSummarySaving(false);
    }
  }

  async function submitDelete() {
    if (!id) {
      setError('Sesion no encontrada.');
      return;
    }
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteWorkoutSession(id);
      router.replace('/sessions?notice=deleted');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo eliminar la sesion.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Detalle sesion</Text>
      {loading && <Text style={styles.empty}>Cargando sesion...</Text>}
      {!id && <Text style={styles.error}>Sesion no encontrada.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {session && (
        <>
          <View style={styles.card}>
            <Text style={styles.name}>{new Date(session.started_at).toLocaleString()}</Text>
            <Text style={styles.meta}>Rutina: {routineName(session.routine_id, routines)}</Text>
            <Text style={styles.meta}>Inicio: {session.started_at}</Text>
            <Text style={styles.meta}>Fin: {session.finished_at ?? 'No informado'}</Text>
            <Text style={styles.meta}>Zona horaria: {session.timezone}</Text>
            <Text style={styles.meta}>Volumen: {formatVolumeByUnit(session.sets)}</Text>
            {session.notes && <Text style={styles.notes}>{session.notes}</Text>}
            <Link href={{ pathname: '/session-edit', params: { sessionId: session.id } }} style={styles.link}>Editar sesion</Link>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Resumen IA post-sesion</Text>
              <Text style={styles.summaryHelp}>Genera un analisis revisable. No modifica rutinas ni sesiones.</Text>
              {summaryLoading && <Text style={styles.meta}>Buscando resumen existente...</Text>}
              <Pressable disabled={summarySaving} onPress={submitGenerateSummary} style={[styles.summaryButton, summarySaving && styles.disabled]}>
                <Text style={styles.summaryButtonText}>{summarySaving ? 'Generando...' : summary ? 'Regenerar resumen IA' : 'Generar resumen IA'}</Text>
              </Pressable>
              {summary && (
                <View style={styles.summaryResult}>
                  <Text style={styles.summaryText}>{summary.summary}</Text>
                  <SummaryList items={summary.improvements} title="Mejoras" />
                  <SummaryList items={summary.drops} title="Caidas" />
                  <SummaryList items={summary.warnings} title="Warnings" variant="warning" />
                  <View style={styles.summaryGroup}>
                    <Text style={styles.summaryGroupTitle}>Proxima recomendacion</Text>
                    <Text style={styles.summaryItem}>{summary.next_recommendation}</Text>
                  </View>
                  <Text style={styles.providerText}>Proveedor IA: {providerSummary(summary)}</Text>
                </View>
              )}
            </View>
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Eliminar sesion</Text>
              <Text style={styles.dangerText}>La sesion se ocultara y dejara de contar para estadisticas y rango.</Text>
              {deleteConfirm && <Text style={styles.dangerText}>Pulsa otra vez para confirmar.</Text>}
              <Pressable disabled={deleting} onPress={submitDelete} style={[styles.deleteButton, deleting && styles.disabled]}>
                <Text style={styles.deleteText}>{deleting ? 'Eliminando...' : 'Eliminar sesion'}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.section}>Series</Text>
          {session.sets.map((set) => (
            <View key={set.id ?? `${set.exercise_id}-${set.set_number}`} style={styles.setCard}>
              <Text style={styles.setTitle}>Serie {set.set_number}: {exerciseName(set.exercise_id, exercises)}</Text>
              <Text style={styles.meta}>{set.reps} reps · {formatWeight(set.weight_value, set.weight_unit)}</Text>
              <Text style={styles.meta}>RPE {set.rpe ?? '-'} · RIR {set.rir ?? '-'} · Descanso {set.rest_seconds ?? '-'}s</Text>
              {set.notes && <Text style={styles.notes}>{set.notes}</Text>}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  section: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, gap: 8, padding: 16 },
  setCard: { backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: 14, borderWidth: 1, gap: 6, padding: 14 },
  name: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  setTitle: { color: '#f8fafc', fontWeight: '900' },
  meta: { color: '#94a3b8' },
  notes: { color: '#cbd5e1', fontStyle: 'italic' },
  link: { color: '#7dd3fc', fontWeight: '900', marginTop: 4 },
  summaryBox: { backgroundColor: '#07111f', borderColor: '#1e3a8a', borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 8, padding: 12 },
  summaryTitle: { color: '#bfdbfe', fontWeight: '900' },
  summaryHelp: { color: '#cbd5e1', lineHeight: 20 },
  summaryButton: { alignItems: 'center', backgroundColor: '#38bdf8', borderRadius: 12, padding: 12 },
  summaryButtonText: { color: '#082f49', fontWeight: '900' },
  summaryResult: { backgroundColor: '#020617', borderRadius: 12, gap: 8, padding: 10 },
  summaryText: { color: '#f8fafc', fontWeight: '800', lineHeight: 20 },
  summaryGroup: { gap: 4 },
  summaryGroupTitle: { color: '#93c5fd', fontWeight: '900' },
  summaryItem: { color: '#cbd5e1', lineHeight: 20 },
  warningItem: { color: '#fca5a5', lineHeight: 20 },
  providerText: { color: '#a7f3d0', fontSize: 12, fontWeight: '800' },
  dangerZone: { backgroundColor: '#1f1111', borderColor: '#7f1d1d', borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 8, padding: 12 },
  dangerTitle: { color: '#fecaca', fontWeight: '900' },
  dangerText: { color: '#fca5a5' },
  deleteButton: { alignItems: 'center', backgroundColor: '#dc2626', borderRadius: 12, padding: 12 },
  deleteText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
