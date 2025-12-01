import { Badge } from '@sdl/ui';
import { useEffect, useRef, useState } from 'react';
import { useSyncStatus } from '@sdl/sync-client/react';
import { resolveHealthEndpoint } from '../lib/config/api';

type ConnectionStatus = 'checking' | 'online' | 'offline';

export function ConnectivityIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const controllerRef = useRef<AbortController | null>(null);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const response = await fetch(resolveHealthEndpoint(), {
          cache: 'no-store',
          signal: controller.signal,
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }
        const payload: { status?: string } | null = await response.json().catch(() => null);
        if (!cancelled && payload?.status === 'ok') {
          setStatus('online');
          return;
        }
        throw new Error('Unexpected health response');
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        if (!cancelled) {
          setStatus('offline');
        }
      }
    };

    void checkHealth();
    const interval = setInterval(() => {
      void checkHealth();
    }, 10000);

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
      clearInterval(interval);
    };
  }, []);

  const derivedStatus: ConnectionStatus = (() => {
    if (syncStatus === 'offline' || syncStatus === 'error') {
      return 'offline';
    }
    if (syncStatus === 'connecting') {
      return 'checking';
    }
    return status;
  })();

  const variant = derivedStatus === 'online' ? 'success' : derivedStatus === 'offline' ? 'destructive' : 'secondary';
  const label =
    derivedStatus === 'online' ? 'Connected' : derivedStatus === 'offline' ? 'Offline' : syncStatus === 'connecting' ? 'Syncing…' : 'Checking…';

  return (
    <Badge variant={variant} className="text-xs" role="status" aria-live="polite">
      {label}
    </Badge>
  );
}
