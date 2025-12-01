import { useEffect, useMemo, useState } from 'react';
import { useSyncClient, useSyncStatus } from '@sdl/sync-client/react';
import type { SyncPresenceEvent } from '@sdl/sync-core';
import { useAppStore } from '@/store';

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
  const currentUserId = useAppStore((state) => state.subscription?.user?.id ?? 'unknown-user');
  const [participants, setParticipants] = useState<Record<string, Participant & { lastSeenAt: number }>>({});
  const [history, setHistory] = useState<ExecutionEvent[]>([]);

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
    if (syncStatus !== 'online') return;

    const updatePresence = (event: SyncPresenceEvent) => {
      setParticipants((current) => {
        const deviceId = event.deviceId;
        const existing = current[deviceId] ?? knownParticipants[deviceId];
        const participant: Participant & { lastSeenAt: number } = existing ?? {
          id: deviceId,
          name: existing?.name ?? deviceId,
          lastSeenAt: Date.now(),
        };
        return {
          ...current,
          [deviceId]: { ...participant, lastSeenAt: Date.now() },
        };
      });

      if (event.type === 'cursor' && event.requestId) {
        setHistory((current) => {
          const entry: ExecutionEvent = {
            requestId: event.requestId,
            userId: event.deviceId,
            at: new Date().toISOString(),
          };
          return [entry, ...current].slice(0, 15);
        });
      }
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

    return () => {
      clearInterval(heartbeat);
      syncClient.off('presence', updatePresence);
    };
  }, [knownParticipants, syncClient, syncStatus]);

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
