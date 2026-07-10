import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { restoreSession } from '@/api/client';

export default function IndexScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    restoreSession()
      .then((user) => {
        if (user) {
          router.replace('/dashboard');
        }
      })
      .finally(() => setChecking(false));
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.eyebrow}>Gym AI</Text>
      <Text style={styles.title}>Rutinas, registros y progreso con criterio.</Text>
      <Text style={styles.subtitle}>
        Scaffold inicial conectado al backend: autenticacion, rango actual y ejercicios globales.
      </Text>
      {checking && <Text style={styles.checking}>Comprobando sesion guardada...</Text>}
      <View style={styles.actions}>
        <Link href="/login" style={styles.primaryLink}>Iniciar sesion</Link>
        <Link href="/register" style={styles.secondaryLink}>Crear cuenta</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'flex-end',
    padding: 24,
    gap: 18,
  },
  eyebrow: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 17,
    lineHeight: 24,
  },
  checking: {
    color: '#94a3b8',
  },
  actions: {
    gap: 12,
    marginTop: 16,
    marginBottom: 18,
  },
  primaryLink: {
    color: '#020617',
    backgroundColor: '#38bdf8',
    borderRadius: 16,
    fontSize: 17,
    fontWeight: '800',
    padding: 16,
    textAlign: 'center',
  },
  secondaryLink: {
    color: '#f8fafc',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 17,
    fontWeight: '800',
    padding: 16,
    textAlign: 'center',
  },
});
