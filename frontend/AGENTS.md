# Frontend Expo

- Leer documentacion versionada de Expo SDK 57 antes de tocar APIs de Expo: https://docs.expo.dev/versions/v57.0.0/.
- Usar Expo Router; las rutas viven en `src/app/`.
- Ejecutar comandos desde `frontend/`.
- `npm run start` — arranca Expo.
- `npm run android` / `npm run ios` / `npm run web` — arranca targets Expo.
- `npm run lint` — ejecuta lint.
- `npm run test` — ejecuta tests de helpers con Vitest.
- `npx tsc --noEmit` — ejecuta typecheck.
- El token se persiste en `src/auth/tokenStorage.ts` con `expo-secure-store`; en web usa `localStorage` como fallback.
- Configurar backend con `EXPO_PUBLIC_API_URL`; en dispositivo fisico no usar `localhost`.
- No guardar refresh tokens ni datos sensibles adicionales sin decision explicita de seguridad.
