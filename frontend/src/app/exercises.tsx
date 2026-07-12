import { ChevronRight, Dumbbell, Plus, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Exercise, getExercises } from '@/api/client';
import { ZenithBottomNav, ZenithCard, ZenithHeader, ZenithIconButton, ZenithNotice, ZenithPill } from '@/components/ZenithUI';
import { ZenithScreen } from '@/components/ZenithScreen';
import { routineAccents, zenith } from '@/constants/zenithTheme';

const ALL = 'Todos';

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState(ALL);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExercises()
      .then(setExercises)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  const muscleOptions = [ALL, ...unique(exercises.flatMap((exercise) => exercise.muscle_groups.map((item) => item.name))).slice(0, 10)];
  const normalizedQuery = normalize(query);
  const filtered = exercises.filter((exercise) => {
    const matchesMuscle = muscle === ALL || exercise.muscle_groups.some((item) => item.name === muscle);
    const searchable = normalize([
      exercise.name,
      exercise.description,
      exercise.difficulty,
      ...exercise.muscle_groups.map((item) => item.name),
      ...exercise.equipment.map((item) => item.name),
    ].filter(Boolean).join(' '));
    return matchesMuscle && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  return (
    <ZenithScreen bottomNav={<ZenithBottomNav />}>
      <ZenithHeader
        subtitle={`${exercises.length} en catalogo`}
        title="Ejercicios"
        right={<ZenithIconButton><Plus color={zenith.colors.primary} size={17} /></ZenithIconButton>}
      />

      <View style={styles.searchBox}>
        <Search color={zenith.colors.muted} size={15} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Buscar ejercicio..."
          placeholderTextColor={zenith.colors.muted}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.chips}>
        {muscleOptions.map((option) => {
          const active = option === muscle;
          return (
            <Pressable key={option} onPress={() => setMuscle(option)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading && <ZenithNotice>Cargando ejercicios...</ZenithNotice>}
      {error && <ZenithNotice tone="danger">{error}</ZenithNotice>}
      {!loading && !error && filtered.length === 0 && <ZenithNotice>No hay ejercicios con esos filtros.</ZenithNotice>}

      <View style={styles.list}>
        {filtered.map((exercise, index) => {
          const accent = routineAccents[index % routineAccents.length];
          return (
            <ZenithCard key={exercise.id} style={styles.card}>
              <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
                <Dumbbell color={accent} size={18} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.name}>{exercise.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{primaryMuscle(exercise)} · {equipmentLabel(exercise)}</Text>
              </View>
              <View style={styles.badges}>
                <ZenithPill color={accent}>{difficultyLabel(exercise.difficulty)}</ZenithPill>
                <Text style={styles.origin}>{exercise.is_global ? 'Global' : 'Propio'}</Text>
              </View>
              <ChevronRight color={zenith.colors.muted} size={15} />
            </ZenithCard>
          );
        })}
      </View>
    </ZenithScreen>
  );
}

function unique(items: string[]) {
  return [...new Set(items)].sort((left, right) => left.localeCompare(right, 'es'));
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function primaryMuscle(exercise: Exercise) {
  return exercise.muscle_groups[0]?.name ?? 'Sin musculo';
}

function equipmentLabel(exercise: Exercise) {
  return exercise.equipment[0]?.name ?? 'Sin equipo';
}

function difficultyLabel(value: string | null) {
  if (value === 'beginner') {
    return 'Base';
  }
  if (value === 'intermediate') {
    return 'Medio';
  }
  if (value === 'advanced') {
    return 'Avanzado';
  }
  return 'Libre';
}

const styles = StyleSheet.create({
  searchBox: { alignItems: 'center', backgroundColor: zenith.colors.secondary, borderColor: zenith.colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 12 },
  searchInput: { color: zenith.colors.foreground, flex: 1, fontFamily: zenith.font.body, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: zenith.colors.secondary, borderColor: zenith.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: zenith.colors.primary, borderColor: zenith.colors.primary },
  chipText: { color: zenith.colors.muted, fontFamily: zenith.font.bodyBold, fontSize: 12 },
  chipTextActive: { color: zenith.colors.primaryForeground },
  list: { gap: 10 },
  card: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 14 },
  iconBox: { alignItems: 'center', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  cardText: { flex: 1, gap: 3 },
  name: { color: zenith.colors.foreground, fontFamily: zenith.font.bodyBold, fontSize: 14 },
  meta: { color: zenith.colors.muted, fontFamily: zenith.font.body, fontSize: 11 },
  badges: { alignItems: 'flex-end', gap: 3 },
  origin: { color: zenith.colors.primary, fontFamily: zenith.font.mono, fontSize: 10 },
});
