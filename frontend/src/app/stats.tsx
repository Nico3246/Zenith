import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ExerciseStats,
  ExerciseStatsDetail,
  ExerciseStatsPoint,
  getExerciseStats,
  getExerciseStatsDetail,
  StatsGroupingPeriod,
  StatsPeriodFilter,
  StatsWeightUnit,
} from '@/api/client';
import { Screen } from '@/components/Screen';
import {
  buildStatsChart,
  formatStatsDate,
  formatStatsDateRange,
  formatStatsPoint,
  formatStatsUnit,
  formatStatsValue,
  isStatsWeightUnit,
  statsKey,
} from '@/utils/statsDisplay';

type WeightFilter = 'all' | StatsWeightUnit;

const PERIODS: { label: string; value: StatsPeriodFilter }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
  { label: 'Todo', value: 'all' },
];

const WEIGHT_FILTERS: { label: string; value: WeightFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'kg', value: 'kg' },
  { label: 'lb', value: 'lb' },
];

const GROUP_PERIODS: { label: string; value: StatsGroupingPeriod }[] = [
  { label: 'Dia', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
];

export default function StatsScreen() {
  const [period, setPeriod] = useState<StatsPeriodFilter>('30d');
  const [weightFilter, setWeightFilter] = useState<WeightFilter>('all');
  const [groupPeriod, setGroupPeriod] = useState<StatsGroupingPeriod>('week');
  const [stats, setStats] = useState<ExerciseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExerciseStatsDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getExerciseStats(period, weightFilter === 'all' ? undefined : weightFilter)
      .then((items) => {
        if (active) {
          setStats(items);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Error');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [period, weightFilter]);

  useEffect(() => {
    const item = expandedKey ? stats.find((entry) => statsKey(entry) === expandedKey) : null;
    if (!item) {
      return;
    }

    let active = true;
    getExerciseStatsDetail(item.exercise_id, {
      periodFilter: period,
      period: groupPeriod,
      weightUnit: isStatsWeightUnit(item.weight_unit) ? item.weight_unit : undefined,
    })
      .then((nextDetail) => {
        if (!active) {
          return;
        }
        const points = item.weight_unit === null
          ? nextDetail.points.filter((point) => point.weight_unit === null)
          : nextDetail.points;
        setDetail({ ...nextDetail, points });
      })
      .catch((caught) => {
        if (active) {
          setDetailError(caught instanceof Error ? caught.message : 'Error');
        }
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [expandedKey, groupPeriod, period, stats]);

  function selectPeriod(nextPeriod: StatsPeriodFilter) {
    if (nextPeriod === period) {
      return;
    }
    resetSummaryState();
    setPeriod(nextPeriod);
  }

  function selectWeightFilter(nextWeightFilter: WeightFilter) {
    if (nextWeightFilter === weightFilter) {
      return;
    }
    resetSummaryState();
    setWeightFilter(nextWeightFilter);
  }

  function selectGroupPeriod(nextGroupPeriod: StatsGroupingPeriod) {
    if (nextGroupPeriod === groupPeriod) {
      return;
    }
    if (expandedKey) {
      setDetail(null);
      setDetailLoading(true);
      setDetailError(null);
    }
    setGroupPeriod(nextGroupPeriod);
  }

  function resetSummaryState() {
    setLoading(true);
    setError(null);
    setExpandedKey(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  }

  function toggleItem(item: ExerciseStats) {
    const key = statsKey(item);
    if (expandedKey === key) {
      setExpandedKey(null);
      setDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    setExpandedKey(key);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Progreso</Text>
        <Text style={styles.title}>Estadisticas</Text>
        <Text style={styles.subtitle}>Volumen, carga y 1RM estimado por ejercicio, sin mezclar kg y lb.</Text>
      </View>

      <FilterGroup label="Periodo" items={PERIODS} value={period} onChange={selectPeriod} />
      <FilterGroup label="Unidad" items={WEIGHT_FILTERS} value={weightFilter} onChange={selectWeightFilter} />
      <FilterGroup label="Detalle" items={GROUP_PERIODS} value={groupPeriod} onChange={selectGroupPeriod} />

      {loading && <Text style={styles.empty}>Cargando estadisticas...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && stats.length === 0 && (
        <Text style={styles.empty}>No hay datos para este periodo. Registra sesiones con ejercicios para ver estadisticas.</Text>
      )}

      {!loading && !error && stats.map((item) => {
        const key = statsKey(item);
        const expanded = expandedKey === key;
        return (
          <Pressable key={key} onPress={() => toggleItem(item)} style={[styles.card, expanded && styles.cardExpanded]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.name}>{item.exercise_name}</Text>
                <Text style={styles.meta}>{formatStatsUnit(item.weight_unit)} · {formatStatsDateRange(item)}</Text>
              </View>
              <Text style={styles.expand}>{expanded ? 'Cerrar' : 'Detalle'}</Text>
            </View>

            <View style={styles.metricGrid}>
              <Metric label="Series" value={String(item.total_sets)} />
              <Metric label="Reps" value={String(item.total_reps)} />
              <Metric label="Volumen" value={formatStatsValue(item.total_volume)} />
              <Metric label="Peso max" value={formatStatsValue(item.max_weight, item.weight_unit)} />
              <Metric label="Promedio" value={formatStatsValue(item.avg_weight, item.weight_unit)} />
              <Metric label="1RM est." value={formatStatsValue(item.best_estimated_1rm, item.weight_unit)} />
            </View>

            {expanded && (
              <View style={styles.detail}>
                {detailLoading && <Text style={styles.detailText}>Cargando detalle...</Text>}
                {detailError && <Text style={styles.error}>{detailError}</Text>}
                {!detailLoading && !detailError && detail && detail.points.length === 0 && (
                  <Text style={styles.detailText}>No hay puntos para este filtro.</Text>
                )}
                {!detailLoading && !detailError && detail && detail.points.length > 0 && (
                  <StatsDetail points={detail.points} unit={item.weight_unit} />
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </Screen>
  );
}

function FilterGroup<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filters}>
        {items.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[styles.filterButton, value === item.value && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, value === item.value && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatsDetail({ points, unit }: { points: ExerciseStatsPoint[]; unit: string | null }) {
  const chart = buildStatsChart(points);
  const visiblePoints = points.slice(-6).reverse();
  return (
    <View style={styles.detailContent}>
      <Text style={styles.chartTitle}>{chart.label}</Text>
      <MiniBarChart bars={chart.bars} />
      <View style={styles.pointsList}>
        {visiblePoints.map((point) => (
          <View key={`${point.period_start}-${point.weight_unit ?? 'bodyweight'}`} style={styles.pointRow}>
            <Text style={styles.pointDate}>{formatStatsDate(point.period_start)}</Text>
            <Text style={styles.pointValue}>{formatStatsPoint(point, unit)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniBarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((bar) => bar.value), 0);
  const visibleBars = bars.slice(-12);
  return (
    <View style={styles.chart}>
      {visibleBars.map((bar, index) => {
        const height = max > 0 ? Math.max(8, Math.round((bar.value / max) * 92)) : 8;
        return (
          <View key={`${bar.label}-${index}`} style={styles.barSlot}>
            <View style={[styles.bar, { height }]} />
            <Text style={styles.barLabel}>{bar.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  eyebrow: { color: '#38bdf8', fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 15, lineHeight: 22 },
  filterSection: { gap: 8 },
  filterLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: { borderColor: '#334155', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  filterButtonActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  filterText: { color: '#cbd5e1', fontWeight: '800' },
  filterTextActive: { color: '#020617' },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 20, borderWidth: 1, gap: 14, padding: 16 },
  cardExpanded: { borderColor: '#38bdf8' },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  cardTitleBlock: { flex: 1, gap: 4 },
  name: { color: '#f8fafc', fontSize: 19, fontWeight: '900' },
  meta: { color: '#94a3b8', fontSize: 13 },
  expand: { color: '#38bdf8', fontSize: 13, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: 14, borderWidth: 1, minWidth: '30%', padding: 10 },
  metricValue: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  metricLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 4 },
  detail: { borderTopColor: '#1e293b', borderTopWidth: 1, paddingTop: 14 },
  detailContent: { gap: 12 },
  detailText: { color: '#cbd5e1' },
  chartTitle: { color: '#cbd5e1', fontWeight: '900' },
  chart: { alignItems: 'flex-end', backgroundColor: '#020617', borderRadius: 16, flexDirection: 'row', gap: 6, minHeight: 130, padding: 12 },
  barSlot: { alignItems: 'center', flex: 1, gap: 6, justifyContent: 'flex-end' },
  bar: { backgroundColor: '#38bdf8', borderRadius: 999, width: '100%' },
  barLabel: { color: '#64748b', fontSize: 9, fontWeight: '700' },
  pointsList: { gap: 8 },
  pointRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  pointDate: { color: '#94a3b8', fontWeight: '800' },
  pointValue: { color: '#e2e8f0', flex: 1, textAlign: 'right' },
  empty: { backgroundColor: '#0f172a', borderRadius: 16, color: '#cbd5e1', padding: 16 },
  error: { color: '#f87171' },
});
