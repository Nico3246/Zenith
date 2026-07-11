import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';

export default function PrivacyScreen() {
  return (
    <Screen>
      <Text style={styles.kicker}>Zenith beta</Text>
      <Text style={styles.title}>Privacidad</Text>
      <Text style={styles.text}>Zenith guarda datos de cuenta y entrenamiento para que puedas consultar rutinas, sesiones, estadisticas, rangos y recomendaciones.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos que guardamos</Text>
        <Text style={styles.item}>- Email, username y password hasheado.</Text>
        <Text style={styles.item}>- Ejercicios propios, rutinas, sesiones, series, pesos, unidades, RPE/RIR, descansos y notas.</Text>
        <Text style={styles.item}>- Sugerencias IA, planes adaptativos y resumenes post-sesion generados para tu cuenta.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IA y datos sensibles</Text>
        <Text style={styles.item}>- La IA usa reglas internas por defecto y no aplica cambios sin aceptacion.</Text>
        <Text style={styles.item}>- Las notas privadas no se envian a la IA.</Text>
        <Text style={styles.item}>- Las limitaciones fisicas pueden ser datos sensibles y solo se usan si confirmas el aviso.</Text>
      </View>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Beta gratuita</Text>
        <Text style={styles.warningText}>La eliminacion/exportacion automatica de cuenta queda pendiente. Durante beta, solicita eliminacion o exportacion al responsable del despliegue.</Text>
      </View>
      <Link href={'/terms' as never} style={styles.link}>Ver terminos</Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: '#38bdf8', fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '900' },
  text: { color: '#cbd5e1', fontSize: 16, lineHeight: 23 },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, gap: 8, padding: 14 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  item: { color: '#cbd5e1', lineHeight: 21 },
  warningBox: { backgroundColor: '#1f1111', borderColor: '#7f1d1d', borderRadius: 16, borderWidth: 1, gap: 8, padding: 14 },
  warningTitle: { color: '#fecaca', fontWeight: '900' },
  warningText: { color: '#fca5a5', lineHeight: 21 },
  link: { color: '#93c5fd', fontWeight: '900' },
});
