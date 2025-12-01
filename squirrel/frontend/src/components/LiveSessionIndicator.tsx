export interface LiveSessionIndicatorProps {
  participants?: number;
  isLive?: boolean;
}

export function LiveSessionIndicator({ participants = 1, isLive = false }: LiveSessionIndicatorProps) {
  const className = `live-session-indicator${isLive ? ' live-session-indicator--active' : ''}`;
  return (
    <div className={className}>
      <span className="live-session-indicator__dot" aria-hidden />
      <span className="live-session-indicator__label">
        {isLive ? 'Live Session Active' : 'Offline mode'} · {participants} participant{participants === 1 ? '' : 's'}
      </span>
    </div>
  );
}

export default LiveSessionIndicator;
