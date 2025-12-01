import { Badge } from '@sdl/ui';
import { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../lib/config/apiConfig';

type ConnectionStatus = 'checking' | 'online' | 'offline';

function resolveHealthUrl(): string {
  return buildApiUrl('/health');
}

export function ConnectivityIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const response = await fetch(resolveHealthUrl(), {
          cache: 'no-store',
          signal: controller.signal,
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

  const variant = status === 'online' ? 'success' : status === 'offline' ? 'destructive' : 'secondary';
  const label = status === 'online' ? 'Connected' : status === 'offline' ? 'Offline' : 'Checking…';

  return (
    <Badge variant={variant} className="text-xs" role="status" aria-live="polite">
      {label}
    </Badge>
  );
}
