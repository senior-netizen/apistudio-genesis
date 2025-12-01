import { create } from '@/vendor/zustand';
import type { HealthDiagnostics, HealthStatus } from '@/utils/healthAnalyzer';
import type { RateLimitInfo } from '@/utils/networkPing';

type SslStatus = 'valid' | 'invalid' | 'unknown';

type HealthSnapshot = HealthDiagnostics & {
  baseUrl?: string;
};

interface HealthState {
  baseUrl?: string;
  healthStatus: HealthStatus;
  latency: number | null;
  rateLimit: RateLimitInfo | null;
  sslStatus: SslStatus;
  diagnostics: HealthSnapshot | null;
  setHealth: (snapshot: HealthSnapshot) => void;
  reset: () => void;
}

const initialState: Omit<HealthState, 'setHealth' | 'reset'> = {
  baseUrl: undefined,
  healthStatus: 'checking',
  latency: null,
  rateLimit: null,
  sslStatus: 'unknown',
  diagnostics: null,
};

export const useHealthStore = create<HealthState>()((set) => ({
  ...initialState,
  setHealth(snapshot) {
    set(() => ({
      baseUrl: snapshot.baseUrl,
      healthStatus: snapshot.status,
      latency: snapshot.latencyMs,
      rateLimit: snapshot.rateLimit ?? null,
      sslStatus: snapshot.sslValid ? 'valid' : snapshot.baseUrl?.startsWith('https') ? 'invalid' : 'unknown',
      diagnostics: snapshot,
    }));
  },
  reset() {
    set(() => ({ ...initialState }));
  },
}));
