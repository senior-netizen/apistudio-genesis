import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Gauge, Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';
import { fetchErrorAnalytics, fetchPerformanceMetrics, fetchUsageRequests } from '../lib/api/analytics';

export interface PerformanceSnapshot {
  endpointId: string;
  avgLatency: number;
  errorRate: number;
  totalSamples: number;
  recommendations?: string[];
}

type Tone = 'success' | 'warning' | 'danger';

const toneStyles: Record<Tone, { badge: string; glow: string; value: string }> = {
  success: {
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    glow: 'from-emerald-500/14',
    value: 'text-emerald-200',
  },
  warning: {
    badge: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
    glow: 'from-amber-400/14',
    value: 'text-amber-100',
  },
  danger: {
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
    glow: 'from-rose-500/14',
    value: 'text-rose-100',
  },
};

const livePulse = {
  animate: { opacity: [0.65, 1, 0.65], scale: [1, 1.08, 1] },
  transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' as const },
};

export function PerformanceDashboard() {
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [performance, usage, errors] = await Promise.all([
          fetchPerformanceMetrics(),
          fetchUsageRequests(),
          fetchErrorAnalytics(),
        ]);
        const totalSamples = usage?.reduce((sum, record) => sum + (record?.count ?? 0), 0) ?? 0;
        const derivedErrorRate = performance?.errorRate ??
          (errors && errors.length ? Math.min(1, errors.reduce((sum, item) => sum + (item.count ?? 0), 0) / Math.max(totalSamples, 1)) : 0);
        if (performance && Object.keys(performance).length > 0) {
          const sampleTotal = totalSamples || performance?.throughputPerMinute || 0;
          setSnapshots([
            {
              endpointId: performance.endpointId ?? 'workspace',
              avgLatency: performance.latencyMs ?? 0,
              errorRate: derivedErrorRate ?? 0,
              totalSamples: sampleTotal,
              recommendations: performance.recommendations ?? [],
            },
          ]);
        } else {
          setSnapshots([]);
        }
      } catch (err) {
        console.error('[analytics] failed to load performance metrics', err);
        setError('Unable to load performance metrics');
        setSnapshots([]);
      } finally {
        setLoading(false);
      }
    };

    void loadMetrics();
  }, []);

  const toneForErrorRate = (errorRate: number): Tone => {
    if (errorRate >= 0.07) return 'danger';
    if (errorRate >= 0.04) return 'warning';
    return 'success';
  };

  const Stat = ({ label, value, tone }: { label: string; value: string; tone?: Tone }) => (
    <div className="rounded-xl border border-white/5 bg-background/70 p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className={cn('mt-2 text-xl font-semibold text-foreground', tone ? toneStyles[tone].value : 'text-foreground')}>
        {value}
      </p>
    </div>
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">Live</p>
          <h2 className="text-lg font-semibold text-foreground">Performance Insights</h2>
          <p className="text-sm text-muted">Monitor latency, reliability, and AI generated recommendations.</p>
        </div>
        <motion.span
          className="inline-flex items-center gap-2 rounded-full border border-[#6C4DFF]/50 bg-[#6C4DFF]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d8d0ff] shadow-soft"
          {...livePulse}
        >
          <span className="h-2 w-2 rounded-full bg-[#6C4DFF] shadow-[0_0_0_8px_rgba(108,77,255,0.18)]" aria-hidden />
          Live
        </motion.span>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {loading && (
          <div className="rounded-xl border border-white/5 bg-background/60 p-6 text-sm text-muted">Loading performance metrics…</div>
        )}
        {!loading && error && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {error}
          </div>
        )}
        {!loading && !error && snapshots.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-background/70 p-6 text-sm text-muted">
            No performance data available yet. Run requests to populate analytics.
          </div>
        )}
        {snapshots.map((snapshot) => {
          const tone = toneForErrorRate(snapshot.errorRate);
          return (
            <article
              key={snapshot.endpointId}
              className={cn(
                'relative overflow-hidden rounded-[18px] border border-white/5 bg-gradient-to-br via-background/80 to-background/95 p-5 shadow-soft',
                `from-foreground/5 ${toneStyles[tone].glow}`,
              )}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-background/80 text-accent">
                    <Gauge className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Endpoint</p>
                    <p className="text-base font-semibold text-foreground">{snapshot.endpointId}</p>
                  </div>
                </div>

                <span
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]',
                    toneStyles[tone].badge,
                  )}
                >
                  <motion.span className="h-2 w-2 rounded-full bg-current" {...livePulse} aria-hidden />
                  {tone === 'danger' ? 'At Risk' : tone === 'warning' ? 'Watch' : 'Healthy'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Avg Latency" value={`${snapshot.avgLatency.toFixed(0)} ms`} />
                <Stat label="Error Rate" value={`${(snapshot.errorRate * 100).toFixed(2)}%`} tone={tone} />
                <Stat label="Total Samples" value={snapshot.totalSamples.toLocaleString()} />
              </div>

              {snapshot.recommendations && snapshot.recommendations.length ? (
                <div className="mt-4 rounded-xl border border-white/5 bg-foreground/5 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-[#d8d0ff]" aria-hidden />
                    AI Recommendations
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/90">
                    {snapshot.recommendations.map((tip) => (
                      <li
                        key={tip}
                        className="flex items-start gap-2 rounded-lg bg-background/70 px-3 py-2 text-xs leading-relaxed text-foreground"
                      >
                        <Activity className="mt-[2px] h-4 w-4 text-accent" aria-hidden />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/5 bg-foreground/5 px-4 py-3 text-sm text-muted">
                  <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden />
                  No AI recommendations. Traffic looks steady.
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default PerformanceDashboard;
