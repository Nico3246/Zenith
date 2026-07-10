import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { login } from '@/api/client';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { loginErrorMessage, SESSION_EXPIRED_NOTICE } from '@/utils/authDisplay';

export default function LoginScreen() {
  const router = useRouter();
  const { notice } = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionNotice = notice === 'session-expired' ? SESSION_EXPIRED_NOTICE : null;

  async function submit() {
    if (!email.trim() || !password) {
      setError('Email y password son obligatorios.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (caught) {
      setError(loginErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Entrar</Text>
      {sessionNotice && <Text style={styles.notice}>{sessionNotice}</Text>}
      <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
      <Field label="Password" onChangeText={setPassword} secureTextEntry value={password} />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton disabled={loading} onPress={submit} title={loading ? 'Entrando...' : 'Iniciar sesion'} />
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
  notice: {
    backgroundColor: '#082f49',
    borderRadius: 14,
    color: '#bae6fd',
    padding: 12,
  },
});
