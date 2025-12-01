import axios, { AxiosError } from 'axios';
import { TokenManager, type TokenUpdate } from '@sdl/sdk/auth';
import { getApiBaseUrl } from '../lib/config/apiConfig';

type TokenBundle = {
  accessToken: string | null;
  refreshToken: string | null;
};

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
    __isRetryRequest?: boolean;
  }
}

const baseURL = getApiBaseUrl();
const refreshStorageKey = 'squirrel.refreshToken';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const authClient = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshStorage = {
  async read(): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(refreshStorageKey);
  },
  async write(value: string | null): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    if (value) {
      window.localStorage.setItem(refreshStorageKey, value);
    } else {
      window.localStorage.removeItem(refreshStorageKey);
    }
  },
};

const tokenManager = new TokenManager({
  storage: refreshStorage,
  leewayMs: 5_000,
});

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padding);
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { atob?: typeof atob }).atob === 'function') {
    return (globalThis as { atob?: typeof atob }).atob?.(padded) ?? '';
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }
  return '';
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload) as Record<string, unknown>;
  } catch (error) {
    console.warn('[squirrel/frontend] Failed to decode token payload', error);
    return null;
  }
}

export const sessionExpiredEventName = 'squirrel:session-expired';
export const logoutEventName = 'squirrel:logout';

const createSessionExpiredDetail = () => ({ message: 'Session expired — click to log back in' } as const);

function emitSessionExpired(detail = createSessionExpiredDetail()) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(sessionExpiredEventName, { detail }));
  window.dispatchEvent(new CustomEvent(logoutEventName, { detail }));
}

async function emitSessionExpiredSafely() {
  if (typeof window === 'undefined') return;
  try {
    const refresh = await tokenManager.getRefreshToken();
    if (!refresh) return;
  } catch {
    return;
  }
  emitSessionExpired();
}

tokenManager.onSessionExpired(() => {
  void emitSessionExpiredSafely();
});

tokenManager.setRefreshHandler(async (refreshToken: string | null) => {
  if (!refreshToken) {
    return null;
  }
  try {
    const response = await authClient.post(
      '/v1/auth/refresh',
      { refreshToken },
      { headers: { Authorization: undefined }, skipAuth: true },
    );
    const update: TokenUpdate = {
      accessToken: response.data.accessToken as string,
    };
    if (typeof response.data.refreshToken === 'string' && response.data.refreshToken) {
      update.refreshToken = response.data.refreshToken;
    }
    return update;
  } catch (error) {
    console.warn('[squirrel/frontend] Refresh request failed', error);
    return null;
  }
});

export { api };

export async function setTokens(bundle: TokenBundle): Promise<void> {
  await tokenManager.applyTokens({
    accessToken: bundle.accessToken,
    refreshToken: bundle.refreshToken,
  });
}

export async function clearTokens(silent = true): Promise<void> {
  await tokenManager.clear({ silent });
}

export function getAccessToken(): string | null {
  return tokenManager.getCachedAccessToken();
}

export async function ensureAccessToken(): Promise<string | null> {
  return tokenManager.ensureAccessToken();
}

export async function getRefreshToken(): Promise<string | null> {
  return tokenManager.getRefreshToken();
}

export async function hasRefreshToken(): Promise<boolean> {
  return (await tokenManager.getRefreshToken()) != null;
}

export function decodeAccessTokenPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }
  return decodeJwt(token);
}

export function getCachedAccessTokenPayload(): Record<string, unknown> | null {
  return decodeAccessTokenPayload(tokenManager.getCachedAccessToken());
}

api.interceptors.request.use(async (config) => {
  const updated = config;
  updated.headers = updated.headers ?? {};
  if (!updated.skipAuth) {
    const refresh = await tokenManager.getRefreshToken();
    const token = refresh ? await tokenManager.ensureAccessToken() : tokenManager.getCachedAccessToken();
    if (token) {
      updated.headers.Authorization = `Bearer ${token}`;
    } else if (updated.headers.Authorization) {
      delete updated.headers.Authorization;
    }
  }
  if (updated.method && ['post', 'patch', 'put', 'delete'].includes(updated.method)) {
    updated.headers['Idempotency-Key'] = crypto.randomUUID();
  }
  return updated;
});

api.interceptors.response.use(
  async (response) => {
    const rotated = response.headers?.['x-access-token'] as string | undefined;
    if (rotated && rotated !== tokenManager.getCachedAccessToken()) {
      await tokenManager.applyTokens({ accessToken: rotated });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest.skipAuth) {
      const refresh = await tokenManager.getRefreshToken();
      if (!refresh) {
        return Promise.reject(error);
      }
      if (originalRequest.__isRetryRequest) {
        return Promise.reject(error);
      }
      originalRequest.__isRetryRequest = true;
      const newToken = await tokenManager.forceRefresh();
      if (newToken) {
        return api(originalRequest);
      }
    }
    if (error.response) {
      const data = error.response.data as { code?: string; message?: string; details?: unknown };
      return Promise.reject({
        code: data?.code ?? 'UNKNOWN_ERROR',
        message: data?.message ?? 'Unexpected error occurred',
        details: data?.details,
        status: error.response.status,
      });
    }
    return Promise.reject(error);
  },
);

export async function login(email: string, password: string, totpCode?: string) {
  const response = await authClient.post(
    '/v1/auth/login',
    { email, password, totpCode },
    { headers: { Authorization: undefined }, skipAuth: true },
  );
  await setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  return response.data;
}

export async function register(payload: {
  email: string;
  password: string;
  displayName: string;
  workspaceName: string;
}) {
  const response = await authClient.post('/v1/auth/register', payload, {
    headers: { Authorization: undefined },
    skipAuth: true,
  });
  await setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  return response.data;
}

export async function logout(): Promise<void> {
  const refreshToken = await tokenManager.getRefreshToken();
  if (!refreshToken) {
    await clearTokens(true);
    return;
  }
  try {
    await authClient.post(
      '/v1/auth/logout',
      { refreshToken },
      { headers: { Authorization: undefined }, skipAuth: true },
    );
  } finally {
    await clearTokens(true);
  }
}
