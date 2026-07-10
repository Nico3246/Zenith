import { AiSuggestion, AiSuggestionStatus, AiSuggestionType } from '@/api/client';

export type AiSuggestionFilter = AiSuggestionStatus | 'all';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

export function aiSuggestionTypeLabel(type: AiSuggestionType) {
  switch (type) {
    case 'increase_weight':
      return 'Subir peso';
    case 'reduce_volume':
      return 'Bajar volumen';
    case 'change_reps':
      return 'Cambiar reps';
    case 'increase_rest':
      return 'Descansar mas';
    case 'plateau_detected':
      return 'Estancamiento';
    case 'deload_recommended':
      return 'Deload recomendado';
    case 'exercise_swap':
      return 'Cambio de ejercicio';
    case 'routine_goal_adjustment':
      return 'Ajuste de objetivo';
  }
}

export function aiSuggestionStatusLabel(status: AiSuggestionStatus) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'accepted':
      return 'Aceptada';
    case 'rejected':
      return 'Rechazada';
    case 'expired':
      return 'Expirada';
  }
}

export function aiSuggestionFilterLabel(filter: AiSuggestionFilter) {
  if (filter === 'all') {
    return 'Todas';
  }
  return aiSuggestionStatusLabel(filter);
}

export function aiSuggestionPrivacyLabel(inputSummary: Record<string, unknown>) {
  const privacy = inputSummary.privacy;
  if (!privacy || typeof privacy !== 'object') {
    return 'Privacidad: datos locales, sin notas.';
  }

  const notesIncluded = 'notes_included' in privacy ? Boolean(privacy.notes_included) : false;
  const externalDataSent = 'external_data_sent' in privacy ? Boolean(privacy.external_data_sent) : false;
  return externalDataSent || notesIncluded
    ? 'Privacidad: revisar datos usados antes de aceptar.'
    : 'Privacidad: IA interna, sin enviar datos fuera y sin usar notas.';
}

export function aiSuggestionProviderLabel(inputSummary: Record<string, unknown>) {
  const aiProvider = isRecord(inputSummary.ai_provider) ? inputSummary.ai_provider : {};
  const provider = textValue(aiProvider.provider) ?? 'internal';
  const model = textValue(aiProvider.model);
  const fallbackUsed = Boolean(aiProvider.fallback_used);
  const providerLabel = provider === 'ollama' ? 'Ollama local' : provider === 'internal' ? 'Interno' : provider;
  return `${providerLabel}${model ? ` (${model})` : ''}${fallbackUsed ? ' - fallback interno' : ''}`;
}

export function aiSuggestionConfidenceLabel(confidence: AiSuggestion['confidence']) {
  switch (confidence) {
    case 'high':
      return 'Confianza alta';
    case 'medium':
      return 'Confianza media';
    case 'low':
      return 'Confianza baja';
    default:
      return 'Confianza no disponible';
  }
}

export function aiSuggestionChangeSummary(suggestion: AiSuggestion) {
  const changes = isRecord(suggestion.apply_payload.changes) ? suggestion.apply_payload.changes : null;
  if (!changes) {
    return 'Cambio no disponible.';
  }

  const parts: string[] = [];
  const targetWeightValue = textValue(changes.target_weight_value);
  const targetWeightUnit = textValue(changes.target_weight_unit);
  if (targetWeightValue && targetWeightUnit) {
    parts.push(`Peso objetivo: ${targetWeightValue} ${targetWeightUnit}`);
  }
  const exerciseId = textValue(changes.exercise_id);
  if (exerciseId) {
    const plannedChange = isRecord(suggestion.input_summary.planned_change) ? suggestion.input_summary.planned_change : {};
    parts.push(`Nuevo ejercicio: ${textValue(plannedChange.exercise_name) ?? exerciseId}`);
  }
  const targetSets = textValue(changes.target_sets);
  if (targetSets) {
    parts.push(`Series objetivo: ${targetSets}`);
  }
  const targetRepsMin = textValue(changes.target_reps_min);
  const targetRepsMax = textValue(changes.target_reps_max);
  if (targetRepsMin && targetRepsMax) {
    parts.push(`Reps objetivo: ${targetRepsMin}-${targetRepsMax}`);
  }
  const restSeconds = textValue(changes.rest_seconds);
  if (restSeconds) {
    parts.push(`Descanso objetivo: ${restSeconds}s`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Cambio no disponible.';
}

export function aiSuggestionDataSummary(suggestion: AiSuggestion) {
  const metrics = isRecord(suggestion.input_summary.metrics) ? suggestion.input_summary.metrics : {};
  const analysisWindow = isRecord(suggestion.input_summary.analysis_window) ? suggestion.input_summary.analysis_window : {};
  const rule = textValue(suggestion.input_summary.rule_triggered) ?? 'sin regla';
  const sessionsUsed = textValue(analysisWindow.sessions_used) ?? '0';
  const avgReps = textValue(metrics.avg_reps) ?? '-';
  const maxWeight = textValue(metrics.max_weight);
  const weightUnit = textValue(metrics.weight_unit);
  const avgRpe = textValue(metrics.avg_rpe) ?? '-';
  const avgRir = textValue(metrics.avg_rir) ?? '-';
  const repDrop = textValue(metrics.rep_drop) ?? '-';
  const weight = maxWeight && weightUnit ? `${maxWeight} ${weightUnit}` : '-';

  return `Regla: ${rule}. Sesiones: ${sessionsUsed}. Reps prom: ${avgReps}. Peso max: ${weight}. RPE prom: ${avgRpe}. RIR prom: ${avgRir}. Caida reps: ${repDrop}.`;
}
