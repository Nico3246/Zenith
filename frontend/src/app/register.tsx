import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

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
});
