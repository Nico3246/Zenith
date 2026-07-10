import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'gym_ai_access_token';
const REFRESH_TOKEN_KEY = 'gym_ai_refresh_token';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function setAccessToken(token: string | null) {
  accessToken = token;
  if (token === null) {
    await clearAccessToken();
    return;
  }

  if (Platform.OS === 'web') {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (token === null) {
    await clearRefreshToken();
    return;
  }

  if (Platform.OS === 'web') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function setAuthTokens(tokens: AuthTokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;

  if (Platform.OS === 'web') {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function getAccessToken() {
  if (accessToken !== null) {
    return accessToken;
  }

  return loadAccessToken();
}

export async function getRefreshToken() {
  if (refreshToken !== null) {
    return refreshToken;
  }

  return loadRefreshToken();
}

export async function loadAccessToken() {
  if (Platform.OS === 'web') {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    return accessToken;
  }

  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return accessToken;
  }

  accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return accessToken;
}

export async function loadRefreshToken() {
  if (Platform.OS === 'web') {
    refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return refreshToken;
  }

  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return refreshToken;
  }

  refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  return refreshToken;
}

export async function loadAuthTokens() {
  const [loadedAccessToken, loadedRefreshToken] = await Promise.all([loadAccessToken(), loadRefreshToken()]);
  return { accessToken: loadedAccessToken, refreshToken: loadedRefreshToken };
}

export async function clearAccessToken() {
  accessToken = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  const isAvailable = await SecureStore.isAvailableAsync();
  if (isAvailable) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  }
}

export async function clearRefreshToken() {
  refreshToken = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }

  const isAvailable = await SecureStore.isAvailableAsync();
  if (isAvailable) {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export async function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;

  if (Platform.OS === 'web') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }

  const isAvailable = await SecureStore.isAvailableAsync();
  if (isAvailable) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}
