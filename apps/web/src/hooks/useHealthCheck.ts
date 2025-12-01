import { useEffect, useMemo, useRef } from 'react';
import { useHealthStore } from '@/state/healthStore';
import { useAppStore } from '@/store';
import { fetchDiagnosticsSnapshot, fetchHealthStatus, runDiagnosticsProbe } from '@/lib/api/diagnostics';

interface Options {
  intervalMs?: number;
}

const DEFAULT_INTERVAL = 15000;

export function useHealthCheck(options: Options = {}) {
  const { intervalMs = DEFAULT_INTERVAL } = options;
  const { activeEnvironmentId, environments, globalVariables } = useAppStore((state) => ({
    activeEnvironmentId: state.activeEnvironmentId,
    environments: state.environments,
    globalVariables: state.globalVariables,
  }));
  const controllerRef = useRef<AbortController | null>(null);
  const setHealth = useHealthStore((state) => state.setHealth);

  const baseUrl = useMemo(() => {
    const activeEnv = environments.find((env) => env.id === activeEnvironmentId);
    const allVariables = [...(activeEnv?.variables ?? []), ...globalVariables];
    const baseVar = allVariables.find((variable) => variable.key === 'baseUrl' && variable.enabled);
    return baseVar?.value ?? '';
  }, [activeEnvironmentId, environments, globalVariables]);

  useEffect(() => {
    if (!baseUrl) return;
    let cancelled = false;
    let attempt = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const runCheck = async () => {
      attempt += 1;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const [health, diagnostics] = await Promise.all([
          fetchHealthStatus(),
          runDiagnosticsProbe(baseUrl),
        ]);
        if (cancelled) return;
        const snapshot = diagnostics ?? (await fetchDiagnosticsSnapshot());
        setHealth({
          baseUrl,
          status: (health as any)?.status ?? snapshot?.status ?? 'checking',
          latencyMs: snapshot?.latencyMs ?? null,
          statusCode: snapshot?.statusCode,
          dnsResolved: snapshot?.dnsResolved ?? true,
          sslValid: snapshot?.sslValid ?? baseUrl.startsWith('https'),
          cors: snapshot?.cors ?? {},
          rateLimit: snapshot?.rateLimit,
          headers: snapshot?.headers,
          errorType: snapshot?.errorType,
          errorMessage: snapshot?.errorMessage,
          recommendations: snapshot?.recommendations ?? [],
          summary: snapshot?.summary ?? 'Awaiting diagnostics',
        });
        attempt = snapshot?.status === 'down' ? attempt : 0;
      } catch (error) {
        if (cancelled) return;
        setHealth({
          status: 'down',
          latencyMs: null,
          statusCode: undefined,
          dnsResolved: true,
          sslValid: baseUrl.startsWith('https'),
          cors: {},
          recommendations: ['Health check failed unexpectedly.'],
          summary: (error as Error)?.message ?? 'Unknown error',
        });
      } finally {
        if (cancelled) return;
        const backoff = Math.min(30000, attempt * 2000 + intervalMs);
        timeoutId = setTimeout(runCheck, backoff);
      }
    };

    runCheck();

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [baseUrl, intervalMs, setHealth]);
}
