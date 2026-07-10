const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!configuredApiUrl && process.env.NODE_ENV === 'production') {
  throw new Error('EXPO_PUBLIC_API_URL is required for production builds.');
}

export const API_URL = configuredApiUrl ?? 'http://localhost:8000';
