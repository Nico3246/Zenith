import { describe, expect, it } from 'vitest';

import { AiSuggestion } from '@/api/client';

import {
  aiSuggestionChangeSummary,
  aiSuggestionConfidenceLabel,
  aiSuggestionDataSummary,
  aiSuggestionFilterLabel,
  aiSuggestionPrivacyLabel,
  aiSuggestionProviderLabel,
  aiSuggestionStatusLabel,
  aiSuggestionTypeLabel,
} from './coachDisplay';

const suggestion: AiSuggestion = {
  id: 'suggestion-1',
  user_id: 'user-1',
  routine_id: 'routine-1',
  routine_exercise_id: 'routine-exercise-1',
  exercise_id: 'exercise-1',
  type: 'increase_weight',
  status: 'pending',
  input_summary: {
    ai_provider: { provider: 'ollama', model: 'llama3.2', fallback_used: false },
    rule_triggered: 'rep_target_met_with_recovery_margin',
    analysis_window: { sessions_used: 2 },
    metrics: {
      avg_reps: '8.00',
      max_weight: '50.00',
      weight_unit: 'kg',
      avg_rpe: '7.00',
      avg_rir: '2.00',
      rep_drop: 0,
    },
  },
  recommendation: 'Sube peso',
  explanation: 'Progresion estable',
  risk_notes: 'No aplicar si duele',
  confidence: 'high',
  apply_payload: { changes: { target_weight_value: '51.25', target_weight_unit: 'kg' } },
  created_at: '2026-07-08T10:00:00Z',
  reviewed_at: null,
  applied_at: null,
};

describe('coachDisplay', () => {
  it('formats suggestion types', () => {
    expect(aiSuggestionTypeLabel('increase_weight')).toBe('Subir peso');
    expect(aiSuggestionTypeLabel('reduce_volume')).toBe('Bajar volumen');
    expect(aiSuggestionTypeLabel('change_reps')).toBe('Cambiar reps');
    expect(aiSuggestionTypeLabel('increase_rest')).toBe('Descansar mas');
    expect(aiSuggestionTypeLabel('plateau_detected')).toBe('Estancamiento');
    expect(aiSuggestionTypeLabel('deload_recommended')).toBe('Deload recomendado');
    expect(aiSuggestionTypeLabel('exercise_swap')).toBe('Cambio de ejercicio');
    expect(aiSuggestionTypeLabel('routine_goal_adjustment')).toBe('Ajuste de objetivo');
  });

  it('formats suggestion statuses', () => {
    expect(aiSuggestionStatusLabel('pending')).toBe('Pendiente');
    expect(aiSuggestionStatusLabel('accepted')).toBe('Aceptada');
    expect(aiSuggestionStatusLabel('rejected')).toBe('Rechazada');
    expect(aiSuggestionStatusLabel('expired')).toBe('Expirada');
  });

  it('formats suggestion filters', () => {
    expect(aiSuggestionFilterLabel('all')).toBe('Todas');
    expect(aiSuggestionFilterLabel('pending')).toBe('Pendiente');
  });

  it('formats privacy summary', () => {
    expect(aiSuggestionPrivacyLabel({ privacy: { external_data_sent: false, notes_included: false } })).toBe(
      'Privacidad: IA interna, sin enviar datos fuera y sin usar notas.',
    );
    expect(aiSuggestionPrivacyLabel({ privacy: { external_data_sent: true, notes_included: false } })).toBe(
      'Privacidad: revisar datos usados antes de aceptar.',
    );
  });

  it('formats provider and confidence summaries', () => {
    expect(aiSuggestionProviderLabel(suggestion.input_summary)).toBe('Ollama local (llama3.2)');
    expect(aiSuggestionProviderLabel({ ai_provider: { provider: 'ollama', model: 'llama3.2', fallback_used: true } })).toBe(
      'Ollama local (llama3.2) - fallback interno',
    );
    expect(aiSuggestionConfidenceLabel('high')).toBe('Confianza alta');
    expect(aiSuggestionConfidenceLabel('medium')).toBe('Confianza media');
    expect(aiSuggestionConfidenceLabel('low')).toBe('Confianza baja');
    expect(aiSuggestionConfidenceLabel(null)).toBe('Confianza no disponible');
  });

  it('formats the applicable change summary', () => {
    expect(aiSuggestionChangeSummary(suggestion)).toBe('Peso objetivo: 51.25 kg');
    expect(aiSuggestionChangeSummary({ ...suggestion, apply_payload: { changes: { target_reps_min: 5, target_reps_max: 7 } } })).toBe(
      'Reps objetivo: 5-7',
    );
    expect(aiSuggestionChangeSummary({
      ...suggestion,
      type: 'deload_recommended',
      apply_payload: { changes: { target_sets: 2, target_weight_value: '81.00', target_weight_unit: 'kg', rest_seconds: 210 } },
    })).toBe('Peso objetivo: 81.00 kg | Series objetivo: 2 | Descanso objetivo: 210s');
    expect(aiSuggestionChangeSummary({
      ...suggestion,
      type: 'exercise_swap',
      input_summary: { planned_change: { exercise_name: 'Chest press' } },
      apply_payload: { changes: { exercise_id: 'exercise-2' } },
    })).toBe('Nuevo ejercicio: Chest press');
  });

  it('formats the data used summary', () => {
    expect(aiSuggestionDataSummary(suggestion)).toBe(
      'Regla: rep_target_met_with_recovery_margin. Sesiones: 2. Reps prom: 8.00. Peso max: 50.00 kg. RPE prom: 7.00. RIR prom: 2.00. Caida reps: 0.',
    );
  });
});
