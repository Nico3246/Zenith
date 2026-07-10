import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const secureStoreValues = new Map<string, string>();
  const platform = { OS: 'web' };
  const secureStore = {
    isAvailableAsync: vi.fn(async () => true),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      secureStoreValues.set(key, value);
    }),
    getItemAsync: vi.fn(async (key: string) => secureStoreValues.get(key) ?? null),
    deleteItemAsync: vi.fn(async (key: string) => {
      secureStoreValues.delete(key);
    }),
  };

  return { platform, secureStore, secureStoreValues };
});

vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-secure-store', () => mocks.secureStore);

function installLocalStorage() {
  const values = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    clear: vi.fn(() => {
      values.clear();
    }),
  };

  vi.stubGlobal('localStorage', localStorageMock);
  return localStorageMock;
}

describe('tokenStorage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.platform.OS = 'web';
    mocks.secureStoreValues.clear();
    installLocalStorage();
  });

  it('stores, loads and clears access and refresh tokens on web', async () => {
    const storage = await import('./tokenStorage');

    await storage.setAuthTokens({ accessToken: 'access-token', refreshToken: 'refresh-token' });

    expect(await storage.getAccessToken()).toBe('access-token');
    expect(await storage.getRefreshToken()).toBe('refresh-token');

    const reloadedStorage = await import('./tokenStorage');
    expect(await reloadedStorage.loadAuthTokens()).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });

    await reloadedStorage.clearAuthTokens();

    expect(await reloadedStorage.getAccessToken()).toBeNull();
    expect(await reloadedStorage.getRefreshToken()).toBeNull();
  });

  it('stores, loads and clears access and refresh tokens with SecureStore on native', async () => {
    mocks.platform.OS = 'ios';
    const storage = await import('./tokenStorage');

    await storage.setAuthTokens({ accessToken: 'native-access-token', refreshToken: 'native-refresh-token' });

    expect(await storage.getAccessToken()).toBe('native-access-token');
    expect(await storage.getRefreshToken()).toBe('native-refresh-token');
    expect(mocks.secureStore.setItemAsync).toHaveBeenCalledTimes(2);

    await storage.clearAuthTokens();

    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
    expect(mocks.secureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
