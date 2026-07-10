import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#f8fafc' }}>
      <Stack.Screen name="index" options={{ title: 'Gym AI' }} />
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Registro' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="rank" options={{ title: 'Rango' }} />
      <Stack.Screen name="exercises" options={{ title: 'Ejercicios' }} />
      <Stack.Screen name="routines" options={{ title: 'Rutinas' }} />
      <Stack.Screen name="routine-new" options={{ title: 'Nueva rutina' }} />
      <Stack.Screen name="routine-edit" options={{ title: 'Editar rutina' }} />
      <Stack.Screen name="sessions" options={{ title: 'Sesiones' }} />
      <Stack.Screen name="session-active" options={{ title: 'Sesion activa' }} />
      <Stack.Screen name="session-new" options={{ title: 'Nueva sesion' }} />
      <Stack.Screen name="session-detail" options={{ title: 'Detalle sesion' }} />
      <Stack.Screen name="session-edit" options={{ title: 'Editar sesion' }} />
      <Stack.Screen name="stats" options={{ title: 'Estadisticas' }} />
      <Stack.Screen name="coach" options={{ title: 'Entrenador IA' }} />
      <Stack.Screen name="trainer" options={{ title: 'Entrenador personal' }} />
    </Stack>
  );
}
