import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { register } from '@/api/client';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ZenithCard, ZenithHeader, ZenithLogo, ZenithNotice } from '@/components/ZenithUI';
import { ZenithScreen } from '@/components/ZenithScreen';
import { zenith } from '@/constants/zenithTheme';
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
    <ZenithScreen>
      <ZenithLogo />
      <ZenithHeader title="Crear cuenta" subtitle="Beta Zenith" />
      <ZenithCard style={styles.formCard}>
        <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
        <Field autoCapitalize="none" label="Username" onChangeText={setUsername} value={username} />
        <Field label="Password" onChangeText={setPassword} secureTextEntry value={password} />
      </ZenithCard>
      <ZenithCard style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>Aviso beta</Text>
        <Text style={styles.noticeText}>Zenith no sustituye consejo medico ni profesional. Las limitaciones fisicas son datos sensibles y solo deben indicarse si entiendes el aviso.</Text>
        <View style={styles.legalRow}>
          <Link href={'/privacy' as never} style={styles.link}>Privacidad</Link>
          <Text style={styles.separator}>/</Text>
          <Link href={'/terms' as never} style={styles.link}>Terminos</Link>
        </View>
        <Pressable onPress={() => setAcceptedTerms((current) => !current)} style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          <Text style={styles.checkboxText}>{acceptedTerms ? 'Avisos aceptados' : 'Acepto privacidad, terminos y aviso medico'}</Text>
        </Pressable>
      </ZenithCard>
      {error && <ZenithNotice tone="danger">{error}</ZenithNotice>}
      <PrimaryButton disabled={loading} onPress={submit} title={loading ? 'Creando...' : 'Registrarme'} />
    </ZenithScreen>
  );
}

const styles = StyleSheet.create({
  formCard: { gap: 14 },
  noticeBox: {
    gap: 10,
  },
  noticeTitle: {
    color: zenith.colors.amber,
    fontFamily: zenith.font.bodyBold,
  },
  noticeText: {
    color: zenith.colors.foreground,
    fontFamily: zenith.font.body,
    lineHeight: 21,
  },
  legalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  link: {
    color: zenith.colors.primary,
    fontFamily: zenith.font.bodyBold,
  },
  separator: {
    color: zenith.colors.muted,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: zenith.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  checkboxChecked: {
    backgroundColor: zenith.colors.primarySoft,
    borderColor: zenith.colors.primary,
  },
  checkboxText: {
    color: zenith.colors.foreground,
    fontFamily: zenith.font.bodyBold,
    textAlign: 'center',
  },
});
