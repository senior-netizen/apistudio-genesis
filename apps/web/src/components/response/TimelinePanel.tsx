import type { RequestTimelineEntry } from '../../types/api';

interface TimelinePanelProps {
  timeline?: RequestTimelineEntry[];
}

export default function TimelinePanel({ timeline }: TimelinePanelProps) {
  if (!timeline) {
    return <p className="text-sm text-muted">No timing information.</p>;
  }

  const total = timeline.reduce((acc, entry) => acc + entry.duration, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted">
        <span>Phase</span>
        <span>Duration (ms)</span>
      </div>
      <div className="space-y-3">
        {timeline.map((entry) => (
          <div key={entry.phase} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-foreground">
              <span className="font-medium uppercase tracking-[0.2em]">{entry.phase}</span>
              <span>{entry.duration}</span>
            </div>
            <div className="h-2 rounded-full bg-border/60">
              <div
                className="h-2 rounded-full bg-accent"
                style={{ width: `${Math.max((entry.duration / total) * 100, 5)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
