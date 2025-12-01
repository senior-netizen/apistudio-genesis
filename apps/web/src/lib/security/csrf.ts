import axios from 'axios';
import { CsrfManager, type CsrfFetcher } from '@sdl/sdk';
import { resolveApiUrl } from '../config/api';

const CSRF_STORAGE_KEY = 'csrfToken';

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
  const token = await CsrfManager.load(endpoint, fetchImpl);
  if (token) {
    setCsrfToken(token);
  }
  return token;
}

export async function fetchAndPersistCsrfToken(): Promise<void> {
  try {
    const response = await axios.get(resolveApiUrl('/auth/csrf'), { withCredentials: true });
    const token = response.data?.csrfToken as string | undefined;
    if (token) {
      setCsrfToken(token);
    }
  } catch (error) {
    console.warn('[csrf] failed to fetch token on boot', error);
  }
}
