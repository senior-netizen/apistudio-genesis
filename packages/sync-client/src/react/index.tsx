import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { InMemoryDurableStorage, SyncClient } from '../index';
import type { DurableStorageAdapter, SyncClientOptions, SyncStatus } from '../types';

interface SyncContextValue {
  client: SyncClient;
  status: SyncStatus;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export interface SyncProviderProps {
  options: Omit<SyncClientOptions, 'storage'>;
  storage?: DurableStorageAdapter;
  children: ReactNode;
  autoConnect?: boolean;
}

export function SyncProvider({ options, storage, children, autoConnect = true }: SyncProviderProps) {
  const [client] = useState(() => {
    const baseOptions = options ?? {
      baseUrl: '/v1',
      workspaceId: 'local-workspace',
      protocolVersion: '1.0.0',
      appKind: 'web' as const,
      clientId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    };
    return new SyncClient({ ...baseOptions, storage: storage ?? new InMemoryDurableStorage() });
  });
  const [status, setStatus] = useState<SyncStatus>(client.getStatus());

  useEffect(() => {
    const handleStatus = (next: SyncStatus) => setStatus(next);
    client.on('status', handleStatus);
    return () => {
      client.off('status', handleStatus);
    };
  }, [client]);

  useEffect(() => {
    if (!autoConnect) {
      return;
    }
    let cancelled = false;
    client
      .connect()
      .catch((error) => {
        if (!cancelled) {
          console.error('[sync-client] failed to connect', error);
        }
      });
    return () => {
      cancelled = true;
      void client.disconnect();
    };
  }, [autoConnect, client]);

  const value = useMemo<SyncContextValue>(() => ({ client, status }), [client, status]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncClient(): SyncClient {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncClient must be used within a SyncProvider');
  }
  return context.client;
}

export function useSyncStatus(): SyncStatus {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncProvider');
  }
  return context.status;
}
