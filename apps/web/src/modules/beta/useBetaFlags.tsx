import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../../lib/api/client';

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

async function fetchFlags(): Promise<{ flags: BetaFlagsState; profile: BetaProfile }> {
  const response = await apiFetch('/v1/beta/flags/me', {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    // In development or when unauthenticated/backends are unavailable,
    // treat failures as non-beta to avoid blocking the UI.
    if ([401, 403, 404, 500].includes(response.status)) {
      return { flags: defaultFlags, profile: {} };
    }
    throw new Error(`Failed to load beta flags: ${response.status}`);
  }
  const payload = await response.json();
  return {
    flags: payload.flags ?? defaultFlags,
    profile: payload.profile ?? {},
  };
}

export function BetaFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<BetaFlagsState>(defaultFlags);
  const [profile, setProfile] = useState<BetaProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchFlags();
      setFlags(result.flags);
      setProfile(result.profile);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load beta flags');
      setFlags(defaultFlags);
      setProfile({});
    } finally {
      setLoading(false);
    }
  }, []);

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
