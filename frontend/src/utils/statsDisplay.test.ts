import { describe, expect, it } from 'vitest';

import { ExerciseStats, ExerciseStatsPoint } from '@/api/client';
import {
  buildStatsChart,
  formatStatsDate,
  formatStatsDateRange,
  formatStatsPoint,
  formatStatsUnit,
  formatStatsValue,
  isStatsWeightUnit,
  numeric,
  shortStatsDate,
  statsKey,
} from './statsDisplay';

function summary(overrides: Partial<ExerciseStats> = {}): ExerciseStats {
  return {
    exercise_id: 'exercise-1',
    exercise_name: 'Press banca',
    weight_unit: 'kg',
    total_sets: 3,
    total_reps: 24,
    total_volume: '1200.00',
    max_weight: '60.00',
    avg_weight: '50.00',
    best_estimated_1rm: '70.00',
    first_session_at: '2026-07-08T12:00:00Z',
    last_session_at: '2026-07-10T12:00:00Z',
    ...overrides,
  };
}

function point(overrides: Partial<ExerciseStatsPoint> = {}): ExerciseStatsPoint {
  return {
    period_start: '2026-07-08T12:00:00Z',
    weight_unit: 'kg',
    total_sets: 3,
    total_reps: 24,
    total_volume: '1200.00',
    max_weight: '60.00',
    avg_weight: '50.00',
    best_estimated_1rm: '70.00',
    ...overrides,
  };
}

describe('statsDisplay', () => {
  it('builds stable stats keys separated by weight unit', () => {
    expect(statsKey(summary({ weight_unit: 'kg' }))).toBe('exercise-1-kg');
    expect(statsKey(summary({ weight_unit: null }))).toBe('exercise-1-bodyweight');
  });

  it('detects supported stats weight units', () => {
    expect(isStatsWeightUnit('kg')).toBe(true);
    expect(isStatsWeightUnit('lb')).toBe(true);
    expect(isStatsWeightUnit(null)).toBe(false);
    expect(isStatsWeightUnit('oz')).toBe(false);
  });

  it('converts numeric strings safely', () => {
    expect(numeric('12.5')).toBe(12.5);
    expect(numeric(null)).toBe(0);
    expect(numeric('abc')).toBe(0);
  });

  it('formats values and units', () => {
    expect(formatStatsValue('50.00', 'kg')).toBe('50.00 kg');
    expect(formatStatsValue('1200.00')).toBe('1200.00');
    expect(formatStatsValue(null, 'kg')).toBe('-');
    expect(formatStatsUnit(null)).toBe('sin peso');
    expect(formatStatsUnit('lb')).toBe('lb');
  });

  it('formats point summaries with volume or reps fallback', () => {
    expect(formatStatsPoint(point(), 'kg')).toBe('Vol 1200.00 · 1RM 70.00 kg');
    expect(formatStatsPoint(point({ total_volume: null, best_estimated_1rm: null }), null)).toBe('24 reps · 3 series');
  });

  it('formats date ranges', () => {
    expect(formatStatsDateRange(summary({ first_session_at: null }))).toBe('sin fechas');
    expect(formatStatsDateRange(summary({ last_session_at: null }))).toBe('sin fechas');
    expect(formatStatsDateRange(summary({ first_session_at: '2026-07-08T12:00:00Z', last_session_at: '2026-07-08T12:00:00Z' }))).toBe(formatStatsDate('2026-07-08T12:00:00Z'));
    expect(formatStatsDateRange(summary())).toBe(`${formatStatsDate('2026-07-08T12:00:00Z')} - ${formatStatsDate('2026-07-10T12:00:00Z')}`);
  });

  it('builds volume charts when any point has volume', () => {
    const chart = buildStatsChart([
      point({ period_start: '2026-07-08T12:00:00Z', total_volume: null, total_reps: 10 }),
      point({ period_start: '2026-07-09T12:00:00Z', total_volume: '900.50', total_reps: 12 }),
      point({ period_start: '2026-07-10T12:00:00Z', total_volume: 'bad-value', total_reps: 14 }),
    ]);

    expect(chart.label).toBe('Volumen por periodo');
    expect(chart.bars).toEqual([
      { label: shortStatsDate('2026-07-08T12:00:00Z'), value: 0 },
      { label: shortStatsDate('2026-07-09T12:00:00Z'), value: 900.5 },
      { label: shortStatsDate('2026-07-10T12:00:00Z'), value: 0 },
    ]);
  });

  it('builds reps charts when no point has volume', () => {
    const chart = buildStatsChart([
      point({ period_start: '2026-07-08T12:00:00Z', total_volume: null, total_reps: 10 }),
      point({ period_start: '2026-07-09T12:00:00Z', total_volume: null, total_reps: 12 }),
    ]);

    expect(chart.label).toBe('Reps por periodo');
    expect(chart.bars).toEqual([
      { label: shortStatsDate('2026-07-08T12:00:00Z'), value: 10 },
      { label: shortStatsDate('2026-07-09T12:00:00Z'), value: 12 },
    ]);
  });
});
