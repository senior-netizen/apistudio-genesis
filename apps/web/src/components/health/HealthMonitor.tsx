import { Button, Card } from '@sdl/ui';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Activity, ShieldCheck, RefreshCw, ExternalLink, Clock4 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useHealthStore } from '@/state/healthStore';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Tooltip } from '../ui/Tooltip';

const STATUS_LABELS: Record<string, string> = {
  live: 'LIVE',
  lagging: 'LAGGING',
  down: 'DOWN',
  rate_limited: '429',
  unauthorized: 'UNAUTHORIZED',
  checking: 'CHECKING',
};

const STATUS_COLORS: Record<string, string> = {
  live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
  lagging: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  down: 'bg-red-500/10 text-red-300 border-red-500/40',
  rate_limited: 'bg-orange-500/10 text-orange-300 border-orange-500/40',
  unauthorized: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40',
  checking: 'bg-foreground/5 text-foreground border-border/60',
};

const pulseVariants = {
  animate: { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] },
  transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
};

export function HealthMonitor() {
  const [open, setOpen] = useState(false);
  useHealthCheck();
  const { healthStatus, latency, rateLimit, sslStatus, diagnostics } = useHealthStore((state) => ({
    healthStatus: state.healthStatus,
    latency: state.latency,
    rateLimit: state.rateLimit,
    sslStatus: state.sslStatus,
    diagnostics: state.diagnostics,
  }));

  const badgeColor = STATUS_COLORS[healthStatus] ?? STATUS_COLORS.live;
  const badgeLabel = STATUS_LABELS[healthStatus] ?? 'LIVE';
  const sslLabel = sslStatus === 'valid' ? 'HTTPS valid' : sslStatus === 'invalid' ? 'HTTPS invalid' : 'HTTPS unknown';
  const rateLimitReset = rateLimit?.reset ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : null;

  const recommendations = useMemo(() => diagnostics?.recommendations.filter(Boolean) ?? [], [diagnostics]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Tooltip content="Environment health monitor">
          <button
            type="button"
            className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${badgeColor}`}
          >
            <motion.span {...pulseVariants} className="h-2 w-2 rounded-full bg-current" aria-hidden />
            <span className="tracking-[0.25em]">{badgeLabel}</span>
            {latency !== null && <span className="text-muted">{latency}ms</span>}
          </button>
        </Tooltip>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 flex items-start justify-center overflow-y-auto p-6">
          <Card className="glass-panel relative w-full max-w-3xl border border-border/60 bg-background/90 p-6 shadow-glass">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-foreground">Health diagnostics</Dialog.Title>
                <p className="text-sm text-muted">Live environment guardrails for the Request Builder.</p>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Close
                </Button>
              </Dialog.Close>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Card className="border-border/60 bg-foreground/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Activity className="h-4 w-4 text-accent" aria-hidden />
                  Status
                </div>
                <p className="mt-2 text-2xl font-bold uppercase tracking-[0.3em] text-foreground">{badgeLabel}</p>
                <p className="text-xs text-muted">{diagnostics?.summary ?? 'Running initial probe…'}</p>
              </Card>
              <Card className="border-border/60 bg-foreground/5 p-4">
                <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                  <span>Latency</span>
                  <RefreshCw className="h-4 w-4 text-muted" aria-hidden />
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{latency !== null ? `${latency}ms` : '—'}</p>
                <p className="text-xs text-muted">DNS resolved: {diagnostics?.dnsResolved ? 'Yes' : 'No'}</p>
              </Card>
              <Card className="border-border/60 bg-foreground/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                  Security
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{sslLabel}</p>
                <p className="text-xs text-muted">CORS: {diagnostics?.cors?.allowedOrigin ? 'Valid' : 'Unconfigured'}</p>
              </Card>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card className="border-border/60 bg-background/70 p-4">
                <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                  <span>Headers (sanitized)</span>
                  <Tooltip content="Sensitive headers are stripped before rendering.">
                    <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                  </Tooltip>
                </div>
                <dl className="mt-3 space-y-2 text-xs text-foreground">
                  {diagnostics?.headers && Object.keys(diagnostics.headers).length ? (
                    Object.entries(diagnostics.headers).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg bg-foreground/5 px-2 py-1">
                        <dt className="uppercase tracking-[0.2em] text-muted">{key}</dt>
                        <dd className="font-mono text-[11px] text-foreground">{String(value)}</dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No safe headers detected.</p>
                  )}
                </dl>
              </Card>

              <Card className="border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 text-orange-400" aria-hidden />
                  Recommendations
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {recommendations.length ? (
                    recommendations.map((rec, index) => (
                      <li key={index} className="rounded-lg bg-foreground/5 px-3 py-2 text-xs leading-relaxed text-foreground">
                        {rec}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-muted">All clear. Keep shipping! 🔥</li>
                  )}
                  {rateLimitReset && (
                    <li className="flex items-center gap-2 text-xs text-orange-300">
                      <Clock4 className="h-4 w-4" aria-hidden /> Rate limit resets at {rateLimitReset}
                    </li>
                  )}
                </ul>
                {(diagnostics?.statusCode === 401 || diagnostics?.statusCode === 403) && (
                  <Button
                    className="mt-3"
                    variant="primary"
                    onClick={() => window.dispatchEvent(new CustomEvent('refresh-token'))}
                  >
                    Refresh token
                  </Button>
                )}
              </Card>
            </div>

            <Card className="mt-4 border-border/60 bg-foreground/5 p-4 text-xs text-muted">
              <p>
                Tip: set your environment <code>baseUrl</code> to <code>https://mock-health.squirrel.dev/rate-limit</code> or
                <code>https://mock-health.squirrel.dev/auth-expired</code> to exercise the mock API without touching production.
              </p>
              <p className="mt-2">
                When the backend sends a <code>Link</code> header with <code>rel="deprecation"</code>, the monitor will surface a
                docs link for migrations.
              </p>
            </Card>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" aria-hidden />
                <span>Runs alongside Request Builder to prevent broken calls.</span>
              </div>
              <Dialog.Close asChild>
                <Button size="sm" variant="subtle">
                  Close
                </Button>
              </Dialog.Close>
            </div>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
