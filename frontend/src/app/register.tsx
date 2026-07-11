import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { register } from '@/api/client';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { registerErrorMessage } from '@/utils/authDisplay';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !username.trim() || !password) {
      setError('Email, username y password son obligatorios.');
      return;
    }
    if (password.length < 8) {
      setError('El password debe tener al menos 8 caracteres.');
      return;
    }
    if (!acceptedTerms) {
      setError('Acepta privacidad, terminos y aviso medico para crear la cuenta.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(email, username, password);
      router.replace('/dashboard');
    } catch (caught) {
      setError(registerErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Crear cuenta</Text>
      <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
      <Field autoCapitalize="none" label="Username" onChangeText={setUsername} value={username} />
      <Field label="Password" onChangeText={setPassword} secureTextEntry value={password} />
      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>Aviso beta</Text>
        <Text style={styles.noticeText}>Zenith no sustituye consejo medico ni profesional. Las limitaciones fisicas son datos sensibles y solo deben indicarse si entiendes el aviso.</Text>
        <View style={styles.legalRow}>
          <Link href={'/privacy' as never} style={styles.link}>Privacidad</Link>
          <Text style={styles.separator}>·</Text>
          <Link href={'/terms' as never} style={styles.link}>Terminos</Link>
        </View>
        <Pressable onPress={() => setAcceptedTerms((current) => !current)} style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          <Text style={styles.checkboxText}>{acceptedTerms ? 'Avisos aceptados' : 'Acepto privacidad, terminos y aviso medico'}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton disabled={loading} onPress={submit} title={loading ? 'Creando...' : 'Registrarme'} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '900',
  },
  error: {
    color: '#f87171',
  },
  noticeBox: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  noticeTitle: {
    color: '#fde68a',
    fontWeight: '900',
  },
  noticeText: {
    color: '#cbd5e1',
    lineHeight: 21,
  },
  legalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  link: {
    color: '#93c5fd',
    fontWeight: '900',
  },
  separator: {
    color: '#64748b',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#475569',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  checkboxChecked: {
    backgroundColor: '#164e63',
    borderColor: '#38bdf8',
  },
  checkboxText: {
    color: '#e0f2fe',
    fontWeight: '900',
    textAlign: 'center',
  },
});
