import { getActiveProfile, loadConfig, saveConfig } from '../config/config';
import { logger } from './logger';

const CSRF_PATHS = ['/auth/csrf', '/v1/auth/csrf'];

let inMemoryToken: string | null = null;
let loading: Promise<string | null> | null = null;

const normaliseBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const buildEndpoints = (baseUrl: string): string[] => {
  const base = normaliseBaseUrl(baseUrl || 'http://localhost:8081');
  const endpoints = new Set<string>();
  CSRF_PATHS.forEach((path) => endpoints.add(`${base}${path}`));
  return Array.from(endpoints);
};

const setToken = (token: string | null): void => {
  inMemoryToken = token;
};

const persistToken = async (token: string | null): Promise<void> => {
  const config = await loadConfig();
  const profile = getActiveProfile(config);
  profile.csrfToken = token ?? undefined;
  await saveConfig({ ...config, profiles: { ...config.profiles, [profile.name]: profile } });
  setToken(token);
};

const fetchCsrfToken = async (endpoint: string): Promise<string | null> => {
  if (loading) {
    return loading;
  }

  loading = (async () => {
    try {
      const response = await fetch(endpoint, { method: 'GET', credentials: 'include' });
      if (!response.ok) {
        return null;
      }
      const data = (await response.json().catch(() => undefined)) as { csrfToken?: string } | undefined;
      const token = data?.csrfToken ?? null;
      setToken(token);
      return token;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Unable to fetch CSRF token from ${endpoint}: ${message}`);
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
};

export const clearCsrfToken = async (): Promise<void> => {
  await persistToken(null);
};

export const ensureCsrfToken = async (force = false, baseUrlOverride?: string): Promise<string | null> => {
  const config = await loadConfig();
  const profile = getActiveProfile(config);

  if (force) {
    await persistToken(null);
  } else {
    const cached = inMemoryToken ?? profile.csrfToken ?? null;
    if (cached) {
      setToken(cached);
      return cached;
    }
  }

  const endpoints = buildEndpoints(baseUrlOverride ?? profile.baseUrl);

  for (const endpoint of endpoints) {
    const token = await fetchCsrfToken(endpoint);
    if (token) {
      await persistToken(token);
      return token;
    }
  }

  logger.warn('CSRF token could not be obtained; authenticated calls may fail.');
  return null;
};

export const persistCsrfToken = persistToken;

export const getCsrfHeader = (): Record<string, string> => {
  return inMemoryToken ? { 'X-CSRF-Token': inMemoryToken } : {};
};
