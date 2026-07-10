import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { acceptAiSuggestion, AiSuggestion, generateAiSuggestions, getAiSuggestions, rejectAiSuggestion } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SegmentedField } from '@/components/SegmentedField';
import {
  AiSuggestionFilter,
  aiSuggestionChangeSummary,
  aiSuggestionConfidenceLabel,
  aiSuggestionDataSummary,
  aiSuggestionFilterLabel,
  aiSuggestionPrivacyLabel,
  aiSuggestionProviderLabel,
  aiSuggestionStatusLabel,
  aiSuggestionTypeLabel,
} from '@/utils/coachDisplay';

const FILTERS: AiSuggestionFilter[] = ['pending', 'accepted', 'rejected', 'expired', 'all'];

export default function CoachScreen() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<AiSuggestionFilter>('pending');
  const visibleSuggestions = filter === 'all' ? suggestions : suggestions.filter((suggestion) => suggestion.status === filter);

  async function loadSuggestions() {
    setError(null);
    const items = await getAiSuggestions();
    setSuggestions(items);
  }

  useEffect(() => {
    let cancelled = false;
    getAiSuggestions()
      .then((items) => {
        if (!cancelled) {
          setSuggestions(items);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'No se pudo cargar el entrenador.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitGenerate() {
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const generated = await generateAiSuggestions();
      await loadSuggestions();
      setNotice(generated.length > 0 ? `Se encontraron ${generated.length} sugerencias aplicables.` : 'No hay cambios aplicables con el historial actual.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron generar sugerencias.');
    } finally {
      setGenerating(false);
    }
  }

  async function submitAccept(suggestionId: string) {
    setWorking(suggestionId);
    setError(null);
    setNotice(null);
    try {
      await acceptAiSuggestion(suggestionId);
      await loadSuggestions();
      setNotice('Sugerencia aceptada. La rutina fue actualizada automaticamente.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo aceptar la sugerencia.');
    } finally {
      setWorking(null);
    }
  }

  async function submitReject(suggestionId: string) {
    setWorking(suggestionId);
    setError(null);
    setNotice(null);
    try {
      await rejectAiSuggestion(suggestionId);
      await loadSuggestions();
      setNotice('Sugerencia rechazada. No se modifico la rutina.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo rechazar la sugerencia.');
    } finally {
      setWorking(null);
    }
  }

  return (
    <Screen>
      <Text style={styles.kicker}>Entrenador IA</Text>
      <Text style={styles.title}>Progresion explicable</Text>
      <Text style={styles.subtitle}>IA interna local: no envia datos fuera y no usa notas. Al aceptar, la rutina se actualiza.</Text>
      <PrimaryButton disabled={generating || loading} onPress={submitGenerate} title={generating ? 'Analizando...' : 'Generar sugerencias'} />
      <SegmentedField
        label="Filtro"
        onValueChange={(value) => setFilter(value as AiSuggestionFilter)}
        options={FILTERS.map((item) => ({ label: aiSuggestionFilterLabel(item), value: item }))}
        selectedValue={filter}
      />
      {loading && <Text style={styles.empty}>Cargando sugerencias...</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && suggestions.length === 0 && <Text style={styles.empty}>No hay sugerencias todavia. Registra varias sesiones y genera un analisis.</Text>}
      {!loading && suggestions.length > 0 && visibleSuggestions.length === 0 && <Text style={styles.empty}>No hay sugerencias para este filtro.</Text>}
      {visibleSuggestions.map((suggestion) => {
        const isPending = suggestion.status === 'pending';
        const isWorking = working === suggestion.id;
        return (
          <View key={suggestion.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.type}>{aiSuggestionTypeLabel(suggestion.type)}</Text>
              <Text style={[styles.status, isPending ? styles.pending : styles.done]}>{aiSuggestionStatusLabel(suggestion.status)}</Text>
            </View>
            <Text style={styles.recommendation}>{suggestion.recommendation}</Text>
            <Text style={styles.explanation}>{suggestion.explanation}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaPill}>{aiSuggestionProviderLabel(suggestion.input_summary)}</Text>
              <Text style={styles.metaPill}>{aiSuggestionConfidenceLabel(suggestion.confidence)}</Text>
            </View>
            {suggestion.risk_notes && (
              <View style={styles.riskBox}>
                <Text style={styles.detailTitle}>Notas de riesgo</Text>
                <Text style={styles.detailText}>{suggestion.risk_notes}</Text>
              </View>
            )}
            <View style={styles.detailBox}>
              <Text style={styles.detailTitle}>Que cambiara</Text>
              <Text style={styles.detailText}>{aiSuggestionChangeSummary(suggestion)}</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailTitle}>Datos usados</Text>
              <Text style={styles.detailText}>{aiSuggestionDataSummary(suggestion)}</Text>
            </View>
            <Text style={styles.privacy}>{aiSuggestionPrivacyLabel(suggestion.input_summary)}</Text>
            {isPending && (
              <View style={styles.actions}>
                <Pressable disabled={isWorking} onPress={() => submitAccept(suggestion.id)} style={[styles.acceptButton, isWorking && styles.disabled]}>
                  <Text style={styles.acceptText}>{isWorking ? 'Aplicando...' : 'Aceptar y aplicar'}</Text>
                </Pressable>
                <Pressable disabled={isWorking} onPress={() => submitReject(suggestion.id)} style={[styles.rejectButton, isWorking && styles.disabled]}>
                  <Text style={styles.rejectText}>Rechazar</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: '#a78bfa', fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#cbd5e1', fontSize: 16, lineHeight: 23 },
  card: { backgroundColor: '#111827', borderColor: '#312e81', borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  type: { color: '#ddd6fe', fontSize: 16, fontWeight: '900' },
  status: { borderRadius: 999, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  pending: { backgroundColor: '#422006', color: '#fde68a' },
  done: { backgroundColor: '#0f172a', color: '#cbd5e1' },
  recommendation: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  explanation: { color: '#cbd5e1', lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { backgroundColor: '#1e1b4b', borderRadius: 999, color: '#c4b5fd', fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  detailBox: { backgroundColor: '#0f172a', borderRadius: 12, gap: 5, padding: 10 },
  riskBox: { backgroundColor: '#1f1111', borderColor: '#7f1d1d', borderRadius: 12, borderWidth: 1, gap: 5, padding: 10 },
  detailTitle: { color: '#bfdbfe', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  detailText: { color: '#dbeafe', lineHeight: 20 },
  privacy: { color: '#93c5fd', fontSize: 13, fontWeight: '700' },
  actions: { gap: 10 },
  acceptButton: { alignItems: 'center', backgroundColor: '#22c55e', borderRadius: 12, padding: 12 },
  acceptText: { color: '#052e16', fontWeight: '900' },
  rejectButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 12, borderWidth: 1, padding: 12 },
  rejectText: { color: '#cbd5e1', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  notice: { color: '#86efac', fontWeight: '800' },
  error: { color: '#f87171' },
});
