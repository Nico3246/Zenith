import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';

export default function TermsScreen() {
  return (
    <Screen>
      <Text style={styles.kicker}>Zenith beta</Text>
      <Text style={styles.title}>Terminos de uso</Text>
      <Text style={styles.text}>Zenith es una herramienta de seguimiento y planificacion de entrenamiento en beta gratuita.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Uso responsable</Text>
        <Text style={styles.item}>- Revisa toda recomendacion antes de aceptarla.</Text>
        <Text style={styles.item}>- No entrenes con dolor, mareo, perdida clara de tecnica o sintomas inusuales.</Text>
        <Text style={styles.item}>- La app no sustituye consejo medico, fisioterapeutico ni de un entrenador cualificado.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IA revisable</Text>
        <Text style={styles.item}>- Las sugerencias son explicables y solo modifican rutinas al aceptarlas.</Text>
        <Text style={styles.item}>- Las sesiones historicas no se modifican por IA.</Text>
        <Text style={styles.item}>- Las preguntas al entrenador no crean cambios automaticos.</Text>
      </View>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Limitaciones de beta</Text>
        <Text style={styles.warningText}>El servicio gratuito puede tener interrupciones, cold starts o limites del proveedor. No uses Zenith como unica copia de datos importantes.</Text>
      </View>
      <Link href={'/privacy' as never} style={styles.link}>Ver privacidad</Link>
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
