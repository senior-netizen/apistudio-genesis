import { Button, Card } from '@sdl/ui';
import { ActivitySquare, BarChart2, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PremiumGate } from '../modules/billing/PremiumGate';
import { UpgradePrompt } from '../modules/billing/UpgradePrompt';
import { useAppStore } from '../store';

type Timeframe = '24h' | '7d' | '30d';

type InsightRow = {
  metric: string;
  baseline: number;
  current: number;
  impact: 'positive' | 'negative';
};

const data: Record<Timeframe, InsightRow[]> = {
  '24h': [
    { metric: 'Checkout success rate', baseline: 98.2, current: 99.1, impact: 'positive' },
    { metric: 'Average reconciliation time', baseline: 4.2, current: 3.4, impact: 'positive' },
    { metric: 'Auth latency (ms)', baseline: 88, current: 104, impact: 'negative' },
  ],
  '7d': [
    { metric: 'Checkout success rate', baseline: 97.6, current: 98.7, impact: 'positive' },
    { metric: 'Average reconciliation time', baseline: 4.6, current: 3.9, impact: 'positive' },
    { metric: 'Auth latency (ms)', baseline: 92, current: 101, impact: 'negative' },
  ],
  '30d': [
    { metric: 'Checkout success rate', baseline: 96.9, current: 98.4, impact: 'positive' },
    { metric: 'Average reconciliation time', baseline: 5.1, current: 3.6, impact: 'positive' },
    { metric: 'Auth latency (ms)', baseline: 94, current: 100, impact: 'negative' },
  ],
};

export function MetricsInsightsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const [focusMetric, setFocusMetric] = useState('Checkout success rate');
  useAppStore((state) => state.subscription?.plan); // ensure subscription data stays reactive

  const rows = data[timeframe];

  const focus = useMemo(() => rows.find((row) => row.metric === focusMetric) ?? rows[0], [rows, focusMetric]);

  return (
    <PremiumGate requiredPlan="pro" feature="Analytics insights" fallback={<UpgradePrompt requiredPlan="pro" feature="Analytics insights" />}>
      <section className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Insights</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Metrics &amp; Insights</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">Fuse telemetry from Watchtower, contract changes from Forge, and customer sentiment into a single decision cockpit. Each slice is correlated with deployment rituals so you can explain any regression instantly.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['24h', '7d', '30d'] as Timeframe[]).map((window) => (
              <Button key={window} variant={timeframe === window ? 'primary' : 'subtle'} onClick={() => setTimeframe(window)}>
                {window}
              </Button>
            ))}
          </div>
        </div>

        <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BarChart2 className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Signal breakdown</h2>
            </div>
            <Button size="sm" variant="ghost">
              <Filter className="mr-2 h-4 w-4" aria-hidden />
              Configure correlations
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[2fr_3fr]">
            <div className="space-y-4">
              {rows.map((row) => (
                <button
                  key={row.metric}
                  type="button"
                  onClick={() => setFocusMetric(row.metric)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    focusMetric === row.metric
                      ? 'border-foreground/60 bg-foreground/10 text-foreground'
                      : 'border-border/40 bg-white/70 text-muted hover:border-border/70 hover:text-foreground dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{row.metric}</span>
                    <span className={row.impact === 'positive' ? 'text-xs font-semibold text-emerald-500' : 'text-xs font-semibold text-rose-500'}>
                      {row.current > row.baseline ? `+${(row.current - row.baseline).toFixed(2)}` : `${(row.current - row.baseline).toFixed(2)}`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted">Baseline {row.baseline} • Current {row.current}</p>
                </button>
              ))}
            </div>

            <Card className="border border-border/40 bg-white/80 p-6 text-sm shadow-inner dark:bg-white/5">
              <div className="flex items-center gap-3">
                <ActivitySquare className="h-5 w-5 text-accent" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Focused metric</p>
                  <p className="text-lg font-semibold tracking-tight text-foreground">{focus.metric}</p>
                </div>
              </div>

              <dl className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs uppercase tracking-[0.3em] text-muted">Baseline</dt>
                  <dd className="text-sm text-foreground">{focus.baseline}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs uppercase tracking-[0.3em] text-muted">Current</dt>
                  <dd className="text-sm text-foreground">{focus.current}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-xs uppercase tracking-[0.3em] text-muted">Insight</dt>
                  <dd className="max-w-xs text-sm text-muted">
                    {focus.impact === 'positive'
                      ? 'Retention cohorts improved across all regions following the sync pipeline upgrade.'
                      : 'Latency regressions correlate with the latest auth deployment. Roll back or expand the blue/green window.'}
                  </dd>
                </div>
              </dl>

              <Button className="mt-6" variant="primary">
                Push insight to shared briefing
              </Button>
            </Card>
          </div>
        </Card>
      </section>
    </PremiumGate>
  );
}

export default MetricsInsightsPage;