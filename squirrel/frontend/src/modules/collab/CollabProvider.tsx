import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CollabClient, type CollabCursor, type CollaboratorState } from '@sdl/collab-client';
import { ensureAccessToken, hasRefreshToken } from '../../services/api';
import { getApiBaseUrl } from '../../lib/config/apiConfig';
import { useAppStore } from '../../store';

interface CollabContextValue {
  client: CollabClient | null;
  members: CollaboratorState[];
  updateCursor: (cursor: CollabCursor | null) => void;
}

const CollabContext = createContext<CollabContextValue>({
  client: null,
  members: [],
  updateCursor: () => undefined,
});

export function CollabProvider({ children }: { children: ReactNode }) {
  const workspaceId = useAppStore((state) => state.activeProjectId ?? 'local-workspace');
  const [members, setMembers] = useState<CollaboratorState[]>([]);
  const clientRef = useRef<CollabClient | null>(null);
  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    if (!workspaceId) {
      clientRef.current?.disconnect();
      clientRef.current = null;
      setMembers([]);
      return;
    }
    const client = new CollabClient({
      baseUrl: `${baseUrl}/v1`,
      workspaceId,
      tokenProvider: async () => (await hasRefreshToken().catch(() => false))
        ? await ensureAccessToken().catch(() => null)
        : null,
      withCredentials: true,
    });
    clientRef.current = client;
    const offMembers = client.on('members', (payload) => {
      setMembers(Array.isArray(payload) ? (payload as CollaboratorState[]) : client.getMembers());
    });
    const offError = client.on('error', () => {
      // swallow for now; UI can show offline indicator later
    });
    void client.connect();
    return () => {
      offMembers();
      offError();
      client.disconnect();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [baseUrl, workspaceId]);

  const value = useMemo<CollabContextValue>(
    () => ({
      client: clientRef.current,
      members,
      updateCursor: (cursor) => clientRef.current?.updateCursor(cursor),
    }),
    [members],
  );

  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
}

export function useCollab() {
  return useContext(CollabContext);
}
