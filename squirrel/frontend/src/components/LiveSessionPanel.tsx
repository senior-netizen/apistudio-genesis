import { useEffect, useState } from 'react';

type Participant = { id: string; name: string };
type ExecutionEvent = { requestId: string; userId: string; at: string };

type LiveSessionPanelProps = {
  roomId: string;
  participants?: Participant[];
  onRunRequest?: (requestId: string) => void;
};

export function LiveSessionPanel({ roomId, participants: initialParticipants = [], onRunRequest }: LiveSessionPanelProps) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [history, setHistory] = useState<ExecutionEvent[]>([]);

  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  const simulateRequestRun = () => {
    const event = {
      requestId: `req-${Math.random().toString(36).slice(2, 8)}`,
      userId: participants[0]?.id ?? 'me',
      at: new Date().toISOString(),
    };
    setHistory((current) => [event, ...current].slice(0, 10));
    onRunRequest?.(event.requestId);
  };

  return (
    <section className="live-session-panel">
      <header>
        <h3>Live Session — {roomId}</h3>
        <button type="button" onClick={simulateRequestRun}>
          Simulate Request Run
        </button>
      </header>
      <div className="live-session-panel__body">
        <div className="live-session-panel__participants">
          <h4>Participants</h4>
          <ul>
            {participants.map((participant) => (
              <li key={participant.id}>{participant.name}</li>
            ))}
            {participants.length === 0 && <li>No one connected yet.</li>}
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
