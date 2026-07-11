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
      <Text style={styles.eyebrow}>Zenith</Text>
      <Text style={styles.title}>Entrena, registra y progresa con decisiones revisables.</Text>
      <Text style={styles.subtitle}>
        Crea rutinas, registra sesiones y usa IA interna para sugerencias que solo se aplican si las aceptas.
      </Text>
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>Beta gratuita</Text>
        <Text style={styles.disclaimerText}>Zenith no sustituye consejo medico ni profesional. Si tienes dolor, lesion o dudas de salud, consulta a un profesional.</Text>
      </View>
      {checking && <Text style={styles.checking}>Comprobando sesion guardada...</Text>}
      <View style={styles.actions}>
        <Link href="/login" style={styles.primaryLink}>Iniciar sesion</Link>
        <Link href="/register" style={styles.secondaryLink}>Crear cuenta</Link>
      </View>
      <View style={styles.legalLinks}>
        <Link href={'/privacy' as never} style={styles.legalLink}>Privacidad</Link>
        <Text style={styles.legalSeparator}>·</Text>
        <Link href={'/terms' as never} style={styles.legalLink}>Terminos</Link>
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
  disclaimerBox: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  disclaimerTitle: {
    color: '#fde68a',
    fontWeight: '900',
  },
  disclaimerText: {
    color: '#cbd5e1',
    lineHeight: 21,
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
  legalLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  legalLink: {
    color: '#93c5fd',
    fontWeight: '800',
  },
  legalSeparator: {
    color: '#64748b',
  },
});
