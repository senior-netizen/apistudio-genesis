import type { CurrentUserProfile } from '../../types/auth';
import { create, type StoreApi } from '../../vendor/zustand';
import {
  clearTokens,
  ensureAccessToken,
  hasRefreshToken,
  login as performLogin,
  register as performRegister,
  logout as performLogout,
  logoutEventName,
  sessionExpiredEventName,
} from '../../services/api';
import { fetchCurrentUser } from '../../services/data';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  user: CurrentUserProfile | null;
  error: string | null;
  initialized: boolean;
  initializing: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string, totpCode?: string) => Promise<CurrentUserProfile>;
  register: (payload: {
    email: string;
    password: string;
    displayName: string;
    workspaceName: string;
  }) => Promise<CurrentUserProfile>;
  logout: () => Promise<void>;
  setUser: (user: CurrentUserProfile | null) => void;
}

let listenersRegistered = false;

function extractErrorMessage(error: unknown): string {
  if (!error) {
    return 'Unexpected authentication error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const maybeObject = error as { message?: unknown; status?: unknown };
  if (typeof maybeObject?.message === 'string' && maybeObject.message.trim()) {
    return maybeObject.message;
  }
  return 'Unexpected authentication error';
}

function registerAuthEventListeners(api: StoreApi<AuthState>) {
  if (listenersRegistered || typeof window === 'undefined') {
    return;
  }

  const handleLogout = () => {
    void clearTokens(true);
    api.setState({
      user: null,
      status: 'idle',
      error: null,
      initialized: true,
      initializing: false,
    });
  };

  const handleSessionExpired = (event: Event) => {
    void clearTokens(true);
    const detail = (event as CustomEvent<{ message?: string }>).detail;
    api.setState({
      user: null,
      status: 'error',
      error: detail?.message ?? 'Session expired. Please sign in again.',
      initialized: true,
      initializing: false,
    });
  };

  window.addEventListener(logoutEventName, handleLogout);
  window.addEventListener(sessionExpiredEventName, handleSessionExpired);
  listenersRegistered = true;
}

export const useAuthStore = create<AuthState>((set, get, api) => {
  registerAuthEventListeners(api);

  return {
    status: 'idle',
    user: null,
    error: null,
    initialized: false,
    initializing: false,
    async initialize() {
      if (get().initializing || get().initialized) {
        return;
      }
      set({ initializing: true, status: 'loading', error: null });
      try {
        const hasToken = await hasRefreshToken().catch(() => false);
        if (!hasToken) {
          set({
            status: 'idle',
            user: null,
            initialized: true,
            initializing: false,
            error: null,
          });
          return;
        }
        const access = await ensureAccessToken().catch(() => null);
        if (!access) {
          await clearTokens(true);
          set({
            status: 'idle',
            user: null,
            initialized: true,
            initializing: false,
            error: null,
          });
          return;
        }
        const user = await fetchCurrentUser();
        if (!user) {
          await clearTokens(true);
          set({
            status: 'idle',
            user: null,
            initialized: true,
            initializing: false,
            error: null,
          });
          return;
        }
        set({
          status: 'authenticated',
          user,
          initialized: true,
          initializing: false,
          error: null,
        });
      } catch (error) {
        const message = extractErrorMessage(error);
        await clearTokens(true);
        set({
          status: 'error',
          user: null,
          initialized: true,
          initializing: false,
          error: message,
        });
      }
    },
    async login(email, password, totpCode) {
      set({ status: 'loading', error: null });
      try {
        await performLogin(email, password, totpCode);
        const user = await fetchCurrentUser();
        if (!user) {
          throw new Error('Unable to load user profile.');
        }
        set({
          status: 'authenticated',
          user,
          initialized: true,
          initializing: false,
          error: null,
        });
        return user;
      } catch (error) {
        const message = extractErrorMessage(error);
        await clearTokens(true);
        set({
          status: 'error',
          user: null,
          initialized: true,
          initializing: false,
          error: message,
        });
        throw new Error(message);
      }
    },
    async register(payload) {
      set({ status: 'loading', error: null });
      try {
        await performRegister(payload);
        const user = await fetchCurrentUser();
        if (!user) {
          throw new Error('Unable to load user profile.');
        }
        set({
          status: 'authenticated',
          user,
          initialized: true,
          initializing: false,
          error: null,
        });
        return user;
      } catch (error) {
        const message = extractErrorMessage(error);
        await clearTokens(true);
        set({
          status: 'error',
          user: null,
          initialized: true,
          initializing: false,
          error: message,
        });
        throw new Error(message);
      }
    },
    async logout() {
      try {
        await performLogout();
      } catch (error) {
        console.warn('[auth] Failed to revoke session on logout', error);
      } finally {
        await clearTokens(true);
        set({
          status: 'idle',
          user: null,
          initialized: true,
          initializing: false,
          error: null,
        });
      }
    },
    setUser(user) {
      set((state) => ({
        user,
        status: user ? 'authenticated' : state.status === 'authenticated' ? 'idle' : state.status,
        error: user ? null : state.error,
      }));
    },
  };
});

export function isAuthenticated(): boolean {
  const state = useAuthStore.getState();
  return state.status === 'authenticated' && Boolean(state.user);
}
