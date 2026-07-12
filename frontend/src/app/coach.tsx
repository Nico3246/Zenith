import { Check, Sparkles, X, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { acceptAiSuggestion, AiSuggestion, generateAiSuggestions, getAiSuggestions, rejectAiSuggestion } from '@/api/client';
import { ZenithBottomNav, ZenithButton, ZenithCard, ZenithHeader, ZenithNotice, ZenithPill } from '@/components/ZenithUI';
import { ZenithScreen } from '@/components/ZenithScreen';
import { SegmentedField } from '@/components/SegmentedField';
import { zenith } from '@/constants/zenithTheme';
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
    <ZenithScreen bottomNav={<ZenithBottomNav />}>
      <ZenithHeader title="Coach IA" subtitle="IA personal" right={<View style={styles.headerIcon}><Sparkles color={zenith.colors.primary} size={15} /></View>} />
      <Text style={styles.subtitle}>IA interna local: no envia datos fuera y no usa notas. Al aceptar, la rutina se actualiza.</Text>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Aviso medico</Text>
        <Text style={styles.warningText}>No aceptes cambios si hay dolor, lesion, mareo o tecnica peor. Zenith no sustituye consejo medico ni profesional.</Text>
      </View>
      <ZenithButton disabled={generating || loading} icon={<Zap color={zenith.colors.primaryForeground} fill={zenith.colors.primaryForeground} size={15} />} onPress={submitGenerate} title={generating ? 'Analizando...' : 'Generar sugerencias'} />
      <SegmentedField
        label="Filtro"
        onValueChange={(value) => setFilter(value as AiSuggestionFilter)}
        options={FILTERS.map((item) => ({ label: aiSuggestionFilterLabel(item), value: item }))}
        selectedValue={filter}
      />
      {loading && <ZenithNotice>Cargando sugerencias...</ZenithNotice>}
      {notice && <ZenithNotice tone="success">{notice}</ZenithNotice>}
      {error && <ZenithNotice tone="danger">{error}</ZenithNotice>}
      {!loading && suggestions.length === 0 && <ZenithNotice>No hay sugerencias todavia. Registra varias sesiones y genera un analisis.</ZenithNotice>}
      {!loading && suggestions.length > 0 && visibleSuggestions.length === 0 && <ZenithNotice>No hay sugerencias para este filtro.</ZenithNotice>}
      {visibleSuggestions.map((suggestion) => {
        const isPending = suggestion.status === 'pending';
        const isWorking = working === suggestion.id;
        return (
          <ZenithCard key={suggestion.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.type}>{aiSuggestionTypeLabel(suggestion.type)}</Text>
              <ZenithPill active={isPending}>{aiSuggestionStatusLabel(suggestion.status)}</ZenithPill>
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
                  <Check color={zenith.colors.primaryForeground} size={13} />
                  <Text style={styles.acceptText}>{isWorking ? 'Aplicando...' : 'Aceptar y aplicar'}</Text>
                </Pressable>
                <Pressable disabled={isWorking} onPress={() => submitReject(suggestion.id)} style={[styles.rejectButton, isWorking && styles.disabled]}>
                  <X color={zenith.colors.muted} size={13} />
                  <Text style={styles.rejectText}>Rechazar</Text>
                </Pressable>
              </View>
            )}
          </ZenithCard>
        );
      })}
    </ZenithScreen>
  );
}

const styles = StyleSheet.create({
  headerIcon: { alignItems: 'center', backgroundColor: zenith.colors.primarySoft, borderRadius: 999, height: 38, justifyContent: 'center', width: 38 },
  subtitle: { color: zenith.colors.muted, fontFamily: zenith.font.body, fontSize: 14, lineHeight: 22 },
  card: { borderColor: zenith.colors.border, gap: 10 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  type: { color: zenith.colors.foreground, flex: 1, fontFamily: zenith.font.display, fontSize: 22, lineHeight: 24, textTransform: 'uppercase' },
  recommendation: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold, fontSize: 16 },
  explanation: { color: zenith.colors.muted, fontFamily: zenith.font.body, lineHeight: 21 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { backgroundColor: zenith.colors.secondary, borderRadius: 999, color: zenith.colors.primary, fontFamily: zenith.font.mono, fontSize: 10, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  detailBox: { backgroundColor: zenith.colors.background, borderRadius: 12, gap: 5, padding: 10 },
  warningBox: { backgroundColor: zenith.colors.dangerSoft, borderColor: 'rgba(232,64,64,0.28)', borderRadius: 14, borderWidth: 1, gap: 6, padding: 12 },
  warningTitle: { color: '#fecaca', fontWeight: '900' },
  warningText: { color: '#fca5a5', lineHeight: 20 },
  riskBox: { backgroundColor: zenith.colors.dangerSoft, borderColor: 'rgba(232,64,64,0.28)', borderRadius: 12, borderWidth: 1, gap: 5, padding: 10 },
  detailTitle: { color: zenith.colors.primary, fontFamily: zenith.font.mono, fontSize: 10, textTransform: 'uppercase' },
  detailText: { color: zenith.colors.foreground, fontFamily: zenith.font.body, lineHeight: 20 },
  privacy: { color: zenith.colors.cyan, fontFamily: zenith.font.bodyMedium, fontSize: 12 },
  actions: { gap: 10 },
  acceptButton: { alignItems: 'center', backgroundColor: zenith.colors.primary, borderRadius: 12, flexDirection: 'row', gap: 7, justifyContent: 'center', padding: 12 },
  acceptText: { color: zenith.colors.primaryForeground, fontFamily: zenith.font.bodyBold },
  rejectButton: { alignItems: 'center', borderColor: zenith.colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', padding: 12 },
  rejectText: { color: zenith.colors.muted, fontFamily: zenith.font.bodyBold },
  disabled: { opacity: 0.55 },
});
