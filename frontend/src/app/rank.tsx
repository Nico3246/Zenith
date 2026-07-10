import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getRank, RankProgress, recalculateRank } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { formatNextRank, formatRankCalculatedAt, formatRankScore, rankExplanationLines } from '@/utils/rankDisplay';

export default function RankScreen() {
  const [rank, setRank] = useState<RankProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getRank()
      .then(setRank)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  async function submitRecalculate() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      setRank(await recalculateRank());
      setNotice('Rango recalculado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo recalcular el rango.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Rango actual</Text>
      {loading && <Text style={styles.empty}>Cargando rango...</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {rank && (
        <>
          <View style={styles.card}>
            <Text style={styles.rank}>{rank.rank.name}</Text>
            <Text style={styles.score}>{formatRankScore(rank.score)}</Text>
            {rank.rank.description && <Text style={styles.note}>{rank.rank.description}</Text>}
            <View style={styles.divider} />
            <Text style={styles.line}>Volumen: {rank.volume_score}</Text>
            <Text style={styles.line}>Progresion: {rank.progression_score}</Text>
            <Text style={styles.line}>Amplitud: {rank.breadth_score}</Text>
            <Text style={styles.next}>{formatNextRank(rank)}</Text>
            <Text style={styles.note}>Ultimo calculo persistido: {formatRankCalculatedAt(rank.calculated_at)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.subtitle}>Como se calcula</Text>
            {rankExplanationLines.map((line) => <Text key={line} style={styles.note}>{line}</Text>)}
          </View>
          <PrimaryButton disabled={saving} onPress={submitRecalculate} title={saving ? 'Recalculando...' : 'Recalcular ahora'} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 24, borderWidth: 1, gap: 8, padding: 22 },
  rank: { color: '#38bdf8', fontSize: 30, fontWeight: '900' },
  score: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  line: { color: '#cbd5e1', fontSize: 16 },
  next: { color: '#7dd3fc', fontSize: 16, fontWeight: '900', marginTop: 8 },
  note: { color: '#94a3b8' },
  divider: { backgroundColor: '#1e293b', height: 1, marginVertical: 6 },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  notice: { backgroundColor: '#064e3b', borderRadius: 14, color: '#bbf7d0', padding: 12 },
  error: { color: '#f87171' },
});
