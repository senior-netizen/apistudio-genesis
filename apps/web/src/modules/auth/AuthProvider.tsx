import { brand } from '@sdl/language';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, type AuthUser } from './authStore';
import { useToast } from '../../components/ui/toast';

type LoginHandler = (payload: { email: string; password: string }) => Promise<AuthUser | null>;
type SignupHandler = (payload: { email: string; password: string; name?: string | null }) => Promise<void>;

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  initializing: boolean;
  authenticating: boolean;
  login: LoginHandler;
  signup: SignupHandler;
  logout: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getTokenExpiry(accessToken: string | null): number | null {
  if (!accessToken) {
    return null;
  }
  const [, payload] = accessToken.split('.');
  if (!payload) {
    return null;
  }
  try {
    const decoded = JSON.parse(atob(payload)) as { exp?: number };
    if (typeof decoded.exp === 'number') {
      return decoded.exp * 1000;
    }
  } catch (error) {
    console.warn('[auth] unable to decode token expiry', error);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initializing = useAuthStore((state) => state.initializing);
  const initialized = useAuthStore((state) => state.initialized);
  const authenticating = useAuthStore((state) => state.authenticating);
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const storeLogout = useAuthStore((state) => state.logout);
  const restore = useAuthStore((state) => state.restore);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);

  useEffect(() => {
    if (!initialized) {
      void restore();
    }
  }, [initialized, restore]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }
    const expiry = getTokenExpiry(accessToken);
    if (!expiry) {
      return;
    }
    const now = Date.now();
    const offset = 60_000; // refresh one minute before expiry
    const delay = Math.max(15_000, expiry - now - offset);
    const id = window.setTimeout(() => {
      void refreshAccessToken();
    }, delay);
    return () => {
      window.clearTimeout(id);
    };
  }, [accessToken, isAuthenticated, refreshAccessToken]);

  useEffect(() => {
    if (initializing) {
      return;
    }
    if (isAuthenticated) {
      const publicPaths = ['/login', '/signup'];
      if (publicPaths.includes(location.pathname)) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [initializing, isAuthenticated, navigate, location.pathname]);

  const logout = useCallback(
    async (reason?: string) => {
      await storeLogout(reason);
      navigate('/login', { replace: true });
      if (!reason) {
        push({ title: 'Signed out', description: `You have been signed out of ${brand.productName}.`, variant: 'default' });
      }
    },
    [navigate, push, storeLogout],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      initializing,
      authenticating,
      login,
      signup,
      logout,
    }),
    [user, accessToken, isAuthenticated, initializing, authenticating, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
