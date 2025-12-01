import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../features/auth/useAuthStore';

export interface BetaFlagsState {
  isBeta: boolean;
  group: string | null;
  paymentsSandbox: boolean;
  enableUIv2: boolean;
  enableAIAssist: boolean;
  enablePerfFlags: boolean;
}

interface BetaProfile {
  betaJoined?: string | null;
  betaGroup?: string | null;
  role?: string;
}

interface BetaFlagsContextValue {
  flags: BetaFlagsState;
  profile: BetaProfile;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

const defaultFlags: BetaFlagsState = {
  isBeta: false,
  group: null,
  paymentsSandbox: false,
  enableUIv2: false,
  enableAIAssist: false,
  enablePerfFlags: false,
};

const BetaFlagsContext = createContext<BetaFlagsContextValue>({
  flags: defaultFlags,
  profile: {},
  loading: true,
  refresh: async () => undefined,
});

export function BetaFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<BetaFlagsState>(defaultFlags);
  const [profile, setProfile] = useState<BetaProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const { status, user } = useAuthStore((state) => ({ status: state.status, user: state.user }));
  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setFlags(defaultFlags);
      setProfile({});
      setError(undefined);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get<{ flags?: BetaFlagsState; profile?: BetaProfile }>('/v1/beta/flags/me');
      const payload = response.data ?? {};
      const nextFlags = payload.flags ?? defaultFlags;
      const nextProfile: BetaProfile = { ...(payload.profile ?? {}) };
      if (!nextProfile.role && user?.role) {
        nextProfile.role = user.role;
      }
      setFlags(nextFlags);
      setProfile(nextProfile);
      setError(undefined);
    } catch (err) {
      const statusCode = typeof (err as { status?: number }).status === 'number' ? (err as { status?: number }).status : undefined;
      if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
        setFlags(defaultFlags);
        setProfile(user ? { role: user.role } : {});
        setError(undefined);
      } else {
        setFlags(defaultFlags);
        setProfile(user ? { role: user.role } : {});
        setError(err instanceof Error ? err.message : 'Unable to load beta flags');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<BetaFlagsContextValue>(
    () => ({
      flags,
      profile,
      loading,
      error,
      refresh: load,
    }),
    [flags, profile, loading, error, load],
  );

  return <BetaFlagsContext.Provider value={value}>{children}</BetaFlagsContext.Provider>;
}

export function useBetaFlags() {
  return useContext(BetaFlagsContext);
}
