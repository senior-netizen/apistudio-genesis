import { Button, Card } from '@sdl/ui';
import { Activity, AlarmClock, ArrowRightLeft, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

type Metric = {
  label: string;
  value: string;
  delta: string;
  state: 'positive' | 'neutral' | 'negative';
};

type Incident = {
  id: number;
  title: string;
  timestamp: string;
  resolved: boolean;
};

const initialMetrics: Metric[] = [
  { label: 'p95 latency', value: '142 ms', delta: '-12 ms', state: 'positive' },
  { label: 'availability', value: '99.982%', delta: '+0.003%', state: 'positive' },
  { label: 'error budget', value: '84%', delta: '-4%', state: 'negative' }
];

const initialIncidents: Incident[] = [
  {
    id: 1,
    title: 'SQS replay queue saturation auto-remediated',
    timestamp: '12 minutes ago',
    resolved: true
  },
  {
    id: 2,
    title: 'Rate limit spikes detected in eu-west-1',
    timestamp: '27 minutes ago',
    resolved: false
  }
];

export function WatchtowerPage() {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [live, setLive] = useState(true);

  const posture = useMemo(() => {
    const negative = metrics.some((metric) => metric.state === 'negative');
    if (negative) return 'Elevated';
    const positive = metrics.every((metric) => metric.state === 'positive');
    return positive ? 'Excellent' : 'Nominal';
  }, [metrics]);

  const ingestNewSample = () => {
    setMetrics((current) =>
      current.map((metric) => {
        if (metric.label === 'error budget') {
          return {
            ...metric,
            value: '86%',
            delta: '+2%',
            state: 'neutral'
          };
        }
        if (metric.label === 'p95 latency') {
          return {
            ...metric,
            value: '137 ms',
            delta: '-5 ms',
            state: 'positive'
          };
        }
        return metric;
      })
    );

    setIncidents((current) =>
      current.map((incident) =>
        incident.id === 2
          ? {
              ...incident,
              resolved: true,
              timestamp: 'Resolved just now'
            }
          : incident
      )
    );
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Observability</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Watchtower</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Stream SLIs, guardrails, and incident rituals in one glass panel. Watchtower crunches percentile runs, flake
            detection, and anomaly signatures in real time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={ingestNewSample}>
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
            Ingest new sample
          </Button>
          <Button variant="subtle" onClick={() => setLive((value) => !value)}>
            <AlarmClock className="mr-2 h-4 w-4" aria-hidden />
            {live ? 'Pause live stream' : 'Resume live stream'}
          </Button>
        </div>
      </div>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Operational posture</h2>
          </div>
          <span className="rounded-full border border-border/50 px-4 py-1 text-xs uppercase tracking-[0.3em] text-muted">
            {posture}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border/40 bg-white/70 p-4 text-sm shadow-sm dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
              <p
                className={
                  metric.state === 'positive'
                    ? 'text-xs text-emerald-500'
                    : metric.state === 'negative'
                      ? 'text-xs text-rose-500'
                      : 'text-xs text-muted'
                }
              >
                {metric.delta}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted">
            <ArrowRightLeft className="h-4 w-4" aria-hidden />
            Incident timeline
          </div>
          <ul className="space-y-3">
            {incidents.map((incident) => (
              <li
                key={incident.id}
                className="rounded-xl border border-border/50 bg-white/70 px-4 py-3 text-sm shadow-sm dark:bg-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{incident.title}</p>
                  <span
                    className={
                      incident.resolved
                        ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500'
                        : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500'
                    }
                  >
                    {incident.resolved ? 'Resolved' : 'Investigating'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{incident.timestamp}</p>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </section>
  );
}

export default WatchtowerPage;
