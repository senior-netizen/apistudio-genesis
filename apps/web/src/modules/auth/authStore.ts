import { create } from '@/vendor/zustand';
import { immer } from '@/vendor/zustand/middleware/immer';
import { CsrfManager } from '@sdl/sdk';
import { resolveApiUrl } from '../../lib/config/api';
import { loadCsrfToken, setCsrfToken } from '../../lib/security/csrf';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  isFounder?: boolean | null;
}

interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user?: AuthUser;
}

interface StoredSession {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface AuthState extends StoredSession {
  initialized: boolean;
  initializing: boolean;
  authenticating: boolean;
  isAuthenticated: boolean;
  sessionError?: string;
  restore: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<AuthUser | null>;
  signup: (payload: { email: string; password: string; name?: string | null }) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  setSessionError: (message?: string) => void;
}

const STORAGE_KEY = 'sdl.auth.session';

function loadStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredSession;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      user: parsed.user ?? null,
    };
  } catch (error) {
    console.warn('[auth] unable to parse stored session', error);
    return null;
  }
}

function persistSession(session: StoredSession | null) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

class AuthRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

const CSRF_ENDPOINT = () => resolveApiUrl('/auth/csrf');

async function ensureCsrfToken(force = false) {
  try {
    await loadCsrfToken(CSRF_ENDPOINT(), force);
  } catch (error) {
    // Network hiccups should not force a logout; rely on any cached token instead.
    console.warn('[auth] unable to refresh CSRF token', error);
  }
}

async function performAuthRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  await ensureCsrfToken();
  const response = await fetch(resolveApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...CsrfManager.header(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new AuthRequestError(message || 'Request failed', response.status);
  }
  const json = (await response.json().catch(() => ({}))) as T & { csrfToken?: string };
  if (typeof (json as any).csrfToken === 'string') {
    setCsrfToken((json as any).csrfToken);
  }
  return json;
}

function toStoredSession(state: Pick<AuthState, 'accessToken' | 'refreshToken' | 'user'>): StoredSession {
  return {
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    user: state.user,
  };
}

function isNetworkError(error: unknown): boolean {
  return (
    (error instanceof TypeError && error.message.includes('fetch')) ||
    (error as any)?.code === 'ERR_NETWORK' ||
    (error as any)?.name === 'NetworkError'
  );
}

export const useAuthStore = create<AuthState>(
  immer((set, get) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    initialized: false,
    initializing: true,
    authenticating: false,
    isAuthenticated: false,
    sessionError: undefined,
    async restore() {
      if (get().initialized) {
        return;
      }
      set((state) => {
        state.initializing = true;
      });
      try {
        const stored = loadStoredSession();
        if (stored?.accessToken && stored.refreshToken) {
          set((state) => {
            state.accessToken = stored.accessToken;
            state.refreshToken = stored.refreshToken;
            state.user = stored.user ?? null;
            state.isAuthenticated = true;
          });
          await get().refreshAccessToken();
        } else if (stored?.accessToken) {
          set((state) => {
            state.accessToken = stored.accessToken;
            state.refreshToken = stored.refreshToken;
            state.user = stored.user ?? null;
            state.isAuthenticated = Boolean(stored.accessToken);
          });
        } else {
          set((state) => {
            state.accessToken = null;
            state.refreshToken = null;
            state.user = null;
            state.isAuthenticated = false;
          });
        }
      } finally {
        set((state) => {
          state.initializing = false;
          state.initialized = true;
        });
      }
    },
    async login({ email, password }) {
      set((state) => {
        state.authenticating = true;
      });
      try {
        const data = await performAuthRequest<AuthTokensResponse>('/v1/auth/login', { email, password });
        set((state) => {
          state.accessToken = data.accessToken;
          state.refreshToken = data.refreshToken;
          state.user = data.user ?? state.user;
          state.isAuthenticated = true;
          state.sessionError = undefined;
        });
        persistSession(toStoredSession(get()));
        return data.user ?? null;
      } finally {
        set((state) => {
          state.authenticating = false;
        });
      }
    },
    async signup({ email, password, name }) {
      set((state) => {
        state.authenticating = true;
      });
      try {
        try {
          await performAuthRequest('/v1/auth/register', { email, password, name });
        } catch (error) {
          if (error instanceof AuthRequestError && error.status === 404) {
            await performAuthRequest('/v1/auth/signup', { email, password, name });
          } else {
            throw error;
          }
        }
      } finally {
        set((state) => {
          state.authenticating = false;
        });
      }
    },
    async logout(reason) {
      set((state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.sessionError = reason ?? undefined;
      });
      persistSession(null);
      setCsrfToken(null);
    },
    async refreshAccessToken() {
      const refreshToken = get().refreshToken;
      if (!refreshToken) {
        return null;
      }
      try {
        const data = await performAuthRequest<AuthTokensResponse>('/v1/auth/refresh', { refreshToken });
        if (!data.accessToken || !data.refreshToken) {
          throw new Error('Invalid refresh response');
        }
        set((state) => {
          state.accessToken = data.accessToken;
          state.refreshToken = data.refreshToken;
          state.user = data.user ?? state.user;
          state.isAuthenticated = true;
          state.sessionError = undefined;
        });
        persistSession(toStoredSession(get()));
        return data.accessToken;
      } catch (error) {
        console.warn('[auth] refresh failed', error);
        const networkIssue = isNetworkError(error) || (error instanceof AuthRequestError && error.status === undefined);
        const unauthorized = error instanceof AuthRequestError && [401, 403].includes(error.status ?? 0);
        if (unauthorized) {
          set((state) => {
            state.accessToken = null;
            state.refreshToken = null;
            state.user = null;
            state.isAuthenticated = false;
            state.sessionError = 'Session expired';
          });
          persistSession(null);
          return null;
        }
        // Keep the current session on transient/network errors and surface the message for retry.
        set((state) => {
          state.sessionError =
            error instanceof Error ? error.message : networkIssue ? 'Network unavailable. Will retry.' : 'Unable to refresh session';
        });
        return get().accessToken;
      }
    },
    setSessionError(message) {
      set((state) => {
        state.sessionError = message;
      });
    },
  }))
);
