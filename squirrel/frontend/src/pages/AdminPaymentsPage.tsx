import { useEffect, useState } from 'react';
import { Card } from '@sdl/ui';
import { Activity, BarChart3, Download } from 'lucide-react';
import { BillingApi } from '../lib/api/billing';
import type { RevenueSnapshot } from '../types/subscription';
import { useAppStore } from '../store';
import { PremiumGate } from '../modules/billing/PremiumGate';
import { UpgradePrompt } from '../modules/billing/UpgradePrompt';

export function AdminPaymentsPage() {
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plan = useAppStore((state) => state.subscription?.plan ?? 'free');

  useEffect(() => {
    if (plan !== 'enterprise') return;
    BillingApi.revenue()
      .then(setSnapshot)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load revenue metrics'));
  }, [plan]);

  const totals = snapshot?.currencyBreakdown ?? [];

  return (
    <PremiumGate
      requiredPlan="enterprise"
      feature="Revenue analytics"
      fallback={<UpgradePrompt requiredPlan="enterprise" feature="Revenue analytics" />}
    >
      <section className="space-y-12">
        <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-slate-950 via-black to-slate-900 p-12 text-white shadow-2xl shadow-black/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18)_0,_rgba(0,0,0,0)_65%)]" aria-hidden />
          <div className="relative z-10 space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Finance command</p>
              <h1 className="text-4xl font-semibold tracking-tight">Billing performance</h1>
              <p className="max-w-3xl text-sm text-white/70">
                Orchestrate multi-gateway subscriptions with clarity. Monitor momentum, churn, and resiliency metrics in a calm dashboard inspired by Apple’s design language.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em] text-white/60">
              <span className="rounded-full border border-white/20 px-3 py-1">Enterprise suite</span>
              <span className="rounded-full border border-white/10 px-3 py-1">Live telemetry</span>
            </div>
          </div>
        </div>

        {error && <Card className="border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</Card>}

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Total revenue</p>
            <p className="mt-3 text-4xl font-semibold">${snapshot?.totalRevenue.toFixed(2) ?? '0.00'}</p>
            <p className="mt-2 text-xs text-white/60">Captured across all gateways</p>
          </Card>
          <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">MRR</p>
            <p className="mt-3 text-4xl font-semibold">${snapshot?.mrr.toFixed(2) ?? '0.00'}</p>
            <p className="mt-2 text-xs text-white/60">Rolling 30-day momentum</p>
          </Card>
          <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Churn</p>
            <p className="mt-3 text-4xl font-semibold">{((snapshot?.churnRate ?? 0) * 100).toFixed(1)}%</p>
            <p className="mt-2 text-xs text-white/60">Last 30 days</p>
          </Card>
          <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Failed payments</p>
            <p className="mt-3 text-4xl font-semibold">{snapshot?.failedPayments ?? 0}</p>
            <p className="mt-2 text-xs text-white/60">Action needed</p>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <Card className="space-y-5 rounded-2xl border border-border/40 bg-background/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <BarChart3 className="h-4 w-4 text-accent" aria-hidden />
                Currency breakdown across gateways
              </div>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted hover:border-foreground/60 hover:text-foreground"
              >
                <Download className="h-4 w-4" aria-hidden />
                Export CSV
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-xs uppercase tracking-[0.3em] text-muted">
                  <tr>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((item) => (
                    <tr key={item.currency} className="border-t border-border/30">
                      <td className="px-4 py-3 font-medium text-foreground">{item.currency}</td>
                      <td className="px-4 py-3 text-muted">{Number(item._sum.amount ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="space-y-4 rounded-2xl border border-border/40 bg-background/80 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Active subscribers by gateway</p>
            <ul className="space-y-3 text-sm">
              {(snapshot?.activeByGateway ?? []).map((row) => (
                <li key={row.gateway} className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{row.gateway}</span>
                  <span className="text-muted">{row.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="rounded-2xl border border-border/40 bg-background/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Activity className="h-4 w-4 text-accent" aria-hidden />
              Gateway uptime &amp; latency
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Object.entries(snapshot?.gatewayHealth ?? {}).map(([gateway, metrics]) => (
              <div key={gateway} className="rounded-xl border border-border/40 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">{gateway}</p>
                <p className="mt-2 text-sm text-foreground">Success rate: {metrics.successRate ? `${(metrics.successRate * 100).toFixed(1)}%` : '—'}</p>
                <p className="text-sm text-muted">Latency: {metrics.latencyMs ? `${metrics.latencyMs.toFixed(0)} ms` : '—'}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </PremiumGate>
  );
}

export default AdminPaymentsPage;
