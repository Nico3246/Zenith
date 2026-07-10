import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthExpiredError, getMe, logout, User } from '@/api/client';
import { Screen } from '@/components/Screen';

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((caught) => {
        if (caught instanceof AuthExpiredError) {
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Error');
        router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function submitLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <Screen>
      <Text style={styles.kicker}>Dashboard</Text>
      <Text style={styles.title}>Tu base de entrenamiento</Text>
      {loading && <Text style={styles.subtitle}>Cargando usuario...</Text>}
      {user && <Text style={styles.subtitle}>Sesion iniciada como {user.username}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.grid}>
        <Link href="/rank" style={styles.card}>Ver rango actual</Link>
        <Link href="/exercises" style={styles.card}>Explorar ejercicios</Link>
        <Link href="/routines" style={styles.card}>Rutinas</Link>
        <Link href="/sessions" style={styles.card}>Sesiones</Link>
        <Link href="/stats" style={styles.card}>Estadisticas</Link>
        <Link href={'/coach' as never} style={styles.card}>Entrenador IA</Link>
        <Link href={'/trainer' as never} style={styles.card}>Entrenador personal</Link>
      </View>
      <Pressable onPress={submitLogout} style={styles.logout}>
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: '#38bdf8',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
  },
  error: {
    color: '#f87171',
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    padding: 18,
  },
  logout: {
    alignItems: 'center',
    borderColor: '#334155',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '800',
  },
});
