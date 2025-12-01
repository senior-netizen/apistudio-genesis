import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SyncProvider, useSyncStatus } from '@sdl/sync-client/react';
import { IndexedDbDurableStorage } from '@sdl/sync-client';
import { useAppStore } from '../../store';
import { API_BASE_URL } from '../../lib/config/api';
interface WorkspaceSyncProviderProps {
  children: ReactNode;
}

export function WorkspaceSyncProvider({ children }: WorkspaceSyncProviderProps) {
  const [clientId] = useState(() => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
  const workspaceId = useAppStore((state) => state.activeProjectId ?? 'local-workspace');
  const baseUrl =
    API_BASE_URL && API_BASE_URL.trim().length > 0
      ? API_BASE_URL
      : `${window.location.origin.replace(/\/$/, '')}/api`;
  const storage = useMemo(() => new IndexedDbDurableStorage({ name: 'sdl-sync' }), []);

  const options = useMemo(
    () => ({
      baseUrl: `${baseUrl.replace(/\/$/, '')}/v1`,
      workspaceId,
      protocolVersion: '1.0.0',
      appKind: 'web' as const,
      clientId,
      pullIntervalMs: 7000,
      pushDebounceMs: 400,
      fetchImplementation: globalThis.fetch?.bind(globalThis),
      WebSocketImplementation: globalThis.WebSocket,
    }),
    [baseUrl, clientId, workspaceId],
  );

  return (
    <SyncProvider options={options} storage={storage} autoConnect={Boolean(workspaceId)}>
      <SyncStatusLogger />
      {children}
    </SyncProvider>
  );
}

function SyncStatusLogger() {
  const status = useSyncStatus();
  useEffect(() => {
    console.debug('[sync] status updated', status);
  }, [status]);
  return null;
}
