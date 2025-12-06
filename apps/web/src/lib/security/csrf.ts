import axios from 'axios';
import { CsrfManager, type CsrfFetcher } from '@sdl/sdk';
import { resolveApiUrl } from '../config/api';

const CSRF_STORAGE_KEY = 'csrfToken';

function buildCsrfEndpoints(primary = resolveApiUrl('/auth/csrf')): string[] {
  const fallback = resolveApiUrl('/v1/auth/csrf');
  const endpoints = new Set<string>([primary]);
  endpoints.add(fallback);
  return Array.from(endpoints);
}

export function getStoredCsrfToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(CSRF_STORAGE_KEY);
  } catch (error) {
    console.warn('[csrf] failed to read stored token', error);
    return null;
  }
}

export function setCsrfToken(token: string | null): void {
  CsrfManager.setToken(token);
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (!token) {
      window.localStorage.removeItem(CSRF_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch (error) {
    console.warn('[csrf] failed to persist token', error);
  }
}

export function primeCsrfFromStorage(): string | null {
  const stored = getStoredCsrfToken();
  if (stored) {
    CsrfManager.setToken(stored);
  }
  return stored;
}

export async function loadCsrfToken(
  endpoint = resolveApiUrl('/auth/csrf'),
  force = false,
  fetchImpl?: CsrfFetcher,
): Promise<string | null> {
  if (force) {
    setCsrfToken(null);
  }
  const stored = getStoredCsrfToken();
  if (stored) {
    setCsrfToken(stored);
    return stored;
  }

  for (const candidate of buildCsrfEndpoints(endpoint)) {
    const token = await CsrfManager.load(candidate, fetchImpl);
    if (token) {
      setCsrfToken(token);
      return token;
    }
  }
  return null;
}

export async function fetchAndPersistCsrfToken(): Promise<void> {
  const endpoints = buildCsrfEndpoints();
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, { withCredentials: true });
      const token = response.data?.csrfToken as string | undefined;
      if (token) {
        setCsrfToken(token);
        return;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn('[csrf] failed to fetch token on boot', lastError);
  }
}
