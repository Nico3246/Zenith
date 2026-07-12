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
import { ZenithBottomNav, ZenithHeader, ZenithNotice } from '@/components/ZenithUI';
import { ZenithScreen } from '@/components/ZenithScreen';
import { zenith } from '@/constants/zenithTheme';
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
    <ZenithScreen bottomNav={<ZenithBottomNav />}>
      <ZenithHeader title="Estadisticas" subtitle="Analisis" />
      <Text style={styles.subtitle}>Volumen, carga y 1RM estimado por ejercicio, sin mezclar kg y lb.</Text>

      <FilterGroup label="Periodo" items={PERIODS} value={period} onChange={selectPeriod} />
      <FilterGroup label="Unidad" items={WEIGHT_FILTERS} value={weightFilter} onChange={selectWeightFilter} />
      <FilterGroup label="Detalle" items={GROUP_PERIODS} value={groupPeriod} onChange={selectGroupPeriod} />

      {loading && <ZenithNotice>Cargando estadisticas...</ZenithNotice>}
      {error && <ZenithNotice tone="danger">{error}</ZenithNotice>}
      {!loading && !error && stats.length === 0 && (
        <ZenithNotice>No hay datos para este periodo. Registra sesiones con ejercicios para ver estadisticas.</ZenithNotice>
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
    </ZenithScreen>
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
  subtitle: { color: zenith.colors.muted, fontFamily: zenith.font.body, fontSize: 14, lineHeight: 21 },
  filterSection: { gap: 8 },
  filterLabel: { color: zenith.colors.foreground, fontFamily: zenith.font.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: { backgroundColor: zenith.colors.secondary, borderColor: zenith.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  filterButtonActive: { backgroundColor: zenith.colors.primary, borderColor: zenith.colors.primary },
  filterText: { color: zenith.colors.muted, fontFamily: zenith.font.bodyBold, fontSize: 12 },
  filterTextActive: { color: zenith.colors.primaryForeground },
  card: { backgroundColor: zenith.colors.card, borderColor: zenith.colors.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16 },
  cardExpanded: { borderColor: zenith.colors.primaryBorder },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  cardTitleBlock: { flex: 1, gap: 4 },
  name: { color: zenith.colors.foreground, fontFamily: zenith.font.display, fontSize: 24, lineHeight: 26, textTransform: 'uppercase' },
  meta: { color: zenith.colors.muted, fontFamily: zenith.font.body, fontSize: 12 },
  expand: { color: zenith.colors.primary, fontFamily: zenith.font.bodyBold, fontSize: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { backgroundColor: zenith.colors.background, borderColor: zenith.colors.border, borderRadius: 14, borderWidth: 1, minWidth: '30%', padding: 10 },
  metricValue: { color: zenith.colors.foreground, fontFamily: zenith.font.display, fontSize: 20, lineHeight: 22 },
  metricLabel: { color: zenith.colors.muted, fontFamily: zenith.font.mono, fontSize: 10, marginTop: 4 },
  detail: { borderTopColor: zenith.colors.border, borderTopWidth: 1, paddingTop: 14 },
  detailContent: { gap: 12 },
  detailText: { color: zenith.colors.foreground, fontFamily: zenith.font.body },
  chartTitle: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold },
  chart: { alignItems: 'flex-end', backgroundColor: zenith.colors.background, borderRadius: 16, flexDirection: 'row', gap: 6, minHeight: 130, padding: 12 },
  barSlot: { alignItems: 'center', flex: 1, gap: 6, justifyContent: 'flex-end' },
  bar: { backgroundColor: zenith.colors.primary, borderRadius: 999, width: '100%' },
  barLabel: { color: zenith.colors.muted, fontFamily: zenith.font.mono, fontSize: 9 },
  pointsList: { gap: 8 },
  pointRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  pointDate: { color: zenith.colors.muted, fontFamily: zenith.font.bodyBold },
  pointValue: { color: zenith.colors.foreground, flex: 1, fontFamily: zenith.font.body, textAlign: 'right' },
  error: { color: zenith.colors.danger, fontFamily: zenith.font.body },
});
