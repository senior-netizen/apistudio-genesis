import { useEffect, useMemo, useState } from 'react';
import { useSyncClient, useSyncStatus } from '@sdl/sync-client/react';
import type { SyncPresenceEvent } from '@sdl/sync-core';
import type { SyncConflictEvent, SyncConflictResolutionAction } from '@sdl/sync-client';
import { loadStoredResolutions, persistStoredResolution, type StoredConflictResolution } from './conflictResolutionStore';
import type { SyncConflictEvent } from '@sdl/sync-client';
import { useAuthStore } from '@/modules/auth/authStore';

type Participant = { id: string; name: string };
type ExecutionEvent = { requestId: string; userId: string; at: string };


type LiveSessionPanelProps = {
  roomId: string;
  participants?: Participant[];
  onRunRequest?: (requestId: string) => void;
};

export function LiveSessionPanel({ roomId, participants: initialParticipants = [], onRunRequest }: LiveSessionPanelProps) {
  const syncClient = useSyncClient();
  const syncStatus = useSyncStatus();
  const currentUserId = useAuthStore((state) => state.user?.id ?? 'unknown-user');
  const [participants, setParticipants] = useState<Record<string, Participant & { lastSeenAt: number }>>({});
  const [history, setHistory] = useState<ExecutionEvent[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflictEvent[]>([]);
  const [resolvingConflictKey, setResolvingConflictKey] = useState<string | null>(null);
  const [storedResolutions, setStoredResolutions] = useState<Record<string, StoredConflictResolution>>({});

  const knownParticipants = useMemo(() => {
    return initialParticipants.reduce<Record<string, Participant & { lastSeenAt: number }>>((acc, participant) => {
      acc[participant.id] = { ...participant, lastSeenAt: Date.now() };
      return acc;
    }, {});
  }, [initialParticipants]);

  useEffect(() => {
    setParticipants((current) => ({ ...knownParticipants, ...current }));
  }, [knownParticipants]);


  useEffect(() => {
    setStoredResolutions(loadStoredResolutions());
  }, []);


  useEffect(() => {
    if (syncStatus !== 'online') return;

    const updatePresence = (event: SyncPresenceEvent) => {
      setParticipants((current) => {
        const deviceId = event.deviceId;
        const existing = current[deviceId] ?? knownParticipants[deviceId];
        const participant: Participant & { lastSeenAt: number } = existing ?? {
          id: deviceId,
          name: deviceId,
          lastSeenAt: Date.now(),
        };
        return {
          ...current,
          [deviceId]: { ...participant, lastSeenAt: Date.now() },
        };
      });

      if (event.type === 'cursor' && event.requestId) {
        setHistory((current) => {
          const requestId = event.requestId;
          if (!requestId) {
            return current;
          }
          const entry: ExecutionEvent = {
            requestId,
            userId: event.deviceId,
            at: new Date().toISOString(),
          };
          return [entry, ...current].slice(0, 15);
        });
      }
    };


    const onConflict = (event: SyncConflictEvent) => {
      const key = `${event.scopeType}:${event.scopeId}:${event.deviceId}`;
      if (storedResolutions[key]) {
        return;
      }
      setConflicts((current) => [event, ...current].slice(0, 5));
    };

    const heartbeat = setInterval(() => {
      const deviceId = syncClient.getDeviceId();
      if (!deviceId) return;
      syncClient.sendPresence({ type: 'typing', deviceId, active: false }).catch((error) => {
        console.error('[live-session] Failed to send heartbeat', error);
      });
    }, 12000);

    const announcePresence = async () => {
      const deviceId = syncClient.getDeviceId();
      if (!deviceId) return;
      try {
        await syncClient.sendPresence({ type: 'cursor', deviceId, requestId: undefined, position: Date.now() });
      } catch (error) {
        console.error('[live-session] Failed to announce presence', error);
      }
    };

    void announcePresence();

    syncClient.on('presence', updatePresence);
    syncClient.on('conflict', onConflict);

    return () => {
      clearInterval(heartbeat);
      syncClient.off('presence', updatePresence);
      syncClient.off('conflict', onConflict);
    };
  }, [knownParticipants, storedResolutions, syncClient, syncStatus]);


  const resolveConflict = async (conflict: SyncConflictEvent, action: SyncConflictResolutionAction) => {
    const key = `${conflict.scopeType}:${conflict.scopeId}:${conflict.deviceId}`;
    setResolvingConflictKey(key);
    try {
      await syncClient.resolveConflict(conflict, action);
      persistStoredResolution(key, action);
      setStoredResolutions(loadStoredResolutions());
      setConflicts((current) => current.filter((entry) => !(
        entry.scopeType === conflict.scopeType
        && entry.scopeId === conflict.scopeId
        && entry.deviceId === conflict.deviceId
      )));
    } catch (error) {
      console.error('[live-session] Failed to resolve conflict', error);
    } finally {
      setResolvingConflictKey(null);
    }
  };


  const resolveConflict = async (conflict: SyncConflictEvent, action: SyncConflictResolutionAction) => {
    const key = `${conflict.scopeType}:${conflict.scopeId}:${conflict.deviceId}`;
    setResolvingConflictKey(key);
    try {
      await syncClient.resolveConflict(conflict, action);
      if (action !== 'decline') {
        setConflicts((current) => current.filter((entry) => !(
          entry.scopeType === conflict.scopeType
          && entry.scopeId === conflict.scopeId
          && entry.deviceId === conflict.deviceId
        )));
      }
    } catch (error) {
      console.error('[live-session] Failed to resolve conflict', error);
    } finally {
      setResolvingConflictKey(null);
    }
  };

  const emitRun = async () => {
    const deviceId = syncClient.getDeviceId();
    if (!deviceId) {
      console.warn('[live-session] Cannot emit run without a sync device id');
      return;
    }

    const requestId = `req-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 8)}`;
    const event: ExecutionEvent = { requestId, userId: deviceId, at: new Date().toISOString() };

    try {
      await syncClient.sendPresence({ type: 'cursor', deviceId, requestId, position: Date.now() });
      setHistory((current) => [event, ...current].slice(0, 15));
      onRunRequest?.(requestId);
    } catch (error) {
      console.error('[live-session] Failed to broadcast execution event', error);
    }
  };

  return (
    <section className="live-session-panel">
      <header>
        <h3>Live Session — {roomId}</h3>
        <button type="button" onClick={emitRun} disabled={syncStatus !== 'online'}>
          Broadcast Request Run
        </button>
      </header>
      {conflicts.length > 0 && (
        <div className="mb-3 rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
          <div className="flex items-center justify-between gap-2">
            <strong>Sync conflict detected</strong>
            <button
              type="button"
              onClick={() => setConflicts([])}
              className="rounded border border-amber-300/40 px-2 py-1 text-xs"
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {conflicts.map((conflict, index) => {
              const key = `${conflict.scopeType}:${conflict.scopeId}:${conflict.deviceId}`;
              const isResolving = resolvingConflictKey === key;
              return (
                <li key={`${conflict.scopeType}:${conflict.scopeId}:${index}`}>
                  <div>
                    Scope <code>{conflict.scopeType}:{conflict.scopeId}</code> diverged by {conflict.divergence} from {conflict.deviceId}.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => void resolveConflict(conflict, 'accept')}
                      className="rounded border border-emerald-300/40 px-2 py-1 text-xs"
                    >
                      Accept Server
                    </button>
                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => void resolveConflict(conflict, 'rebase')}
                      className="rounded border border-sky-300/40 px-2 py-1 text-xs"
                    >
                      Rebase
                    </button>
                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => void resolveConflict(conflict, 'decline')}
                      className="rounded border border-amber-300/40 px-2 py-1 text-xs"
                    >
                      Keep Local
                    </button>
                  </div>
                </li>
              );
            })}
            {conflicts.map((conflict, index) => (
              <li key={`${conflict.scopeType}:${conflict.scopeId}:${index}`}>
                Scope <code>{conflict.scopeType}:{conflict.scopeId}</code> diverged by {conflict.divergence} from {conflict.deviceId}.
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="live-session-panel__body">
        <div className="live-session-panel__participants">
          <h4>Participants</h4>
          <ul>
            {Object.values(participants)
              .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
              .map((participant) => (
                <li key={participant.id}>
                  {participant.name}
                  {participant.id === currentUserId ? ' (you)' : ''}
                </li>
              ))}
            {Object.keys(participants).length === 0 && <li>No one connected yet.</li>}
          </ul>
        </div>
        <div className="live-session-panel__history">
          <h4>Recent Runs</h4>
          <ul>
            {history.map((event) => (
              <li key={event.requestId}>
                <code>{event.requestId}</code> by <strong>{event.userId}</strong> at {new Date(event.at).toLocaleTimeString()}
              </li>
            ))}
            {history.length === 0 && <li>No executions in this session.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default LiveSessionPanel;
