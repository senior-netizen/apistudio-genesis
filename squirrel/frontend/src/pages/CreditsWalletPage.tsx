import { useEffect, useMemo, useState } from 'react';
import { Card } from '@sdl/ui';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import BuyCreditsModal from '../components/BuyCreditsModal';
import { CreditsApi, type CreditsOverview } from '../lib/api/credits';
import { useAuthStore } from '../features/auth/useAuthStore';

export default function CreditsWalletPage() {
  const user = useAuthStore((state) => state.user);
  const [overview, setOverview] = useState<CreditsOverview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    CreditsApi.getUserCredits(user.id)
      .then(setOverview)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const monthlyAllocation = 2000;
  const remainingCredits = overview?.balance ?? 0;
  const usedCredits = Math.max(0, monthlyAllocation - remainingCredits);
  const usagePercent = monthlyAllocation > 0 ? Math.round((usedCredits / monthlyAllocation) * 100) : 0;
  const averageDailySpend = Math.round(usedCredits / 7);
  const projectedRunRate = usagePercent > 0 ? Math.round((usedCredits / usagePercent) * 100) : 0;

  const usageHistory = useMemo(
    () =>
      (overview?.usage ?? []).map((entry) => ({
        id: entry.id,
        label: entry.type,
        amount: entry.amount,
        timestamp: new Date(entry.createdAt).toLocaleString(),
      })),
    [overview?.usage],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Credits · Billing · Usage</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Squirrel Credits</h1>
            <p className="text-sm text-muted">
              Manage balance, review transactions, and keep your workflows running without interruptions.
            </p>
          </div>
          <BuyCreditsModal
            onPurchase={(amount) => console.log('Purchase credits', amount)}
            triggerLabel="Top up credits"
            triggerClassName="w-full sm:w-auto"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="rounded-[14px] border border-border/60 bg-background/95 p-6 shadow-soft">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Remaining credits</p>
                <div className="text-5xl font-semibold tracking-tight text-foreground">{remainingCredits.toLocaleString()}</div>
                <p className="text-sm text-muted">of {monthlyAllocation.toLocaleString()} allocated this cycle</p>
              </div>
              <div className="flex h-full min-w-[220px] flex-col gap-3 rounded-[12px] border border-border/50 bg-accent/5 px-5 py-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-accent">
                  Usage this cycle
                  <span>{usagePercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-border/40">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${usagePercent}%` }} />
                </div>
                <p className="text-xs text-muted">
                  {usedCredits.toLocaleString()} credits used across requests, realtime sessions, and automation triggers.
                </p>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 rounded-[14px] border border-border/60 bg-background/95 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Insights</p>
                <h2 className="text-lg font-semibold text-foreground">Usage overview</h2>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex items-center justify-between">
                <span>Average daily spend</span>
                <span className="font-medium text-foreground">{averageDailySpend} credits</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Projected run rate</span>
                <span className="font-medium text-foreground">~{projectedRunRate} credits</span>
              </div>
              <div className="rounded-[12px] border border-border/60 bg-background/80 px-4 py-3 text-xs">
                Stay above 500 credits to keep AI-assisted debugging and deployment automations running in real time.
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-[14px] border border-border/60 bg-background/95 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Usage history</p>
              <h2 className="text-lg font-semibold text-foreground">Transactions</h2>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-[12px] border border-border/60 px-4 py-2 text-sm text-muted transition hover:border-border hover:text-foreground"
              disabled
            >
              Export CSV
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-[12px] border border-border/60">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/50 text-left text-sm">
                <thead className="bg-background/80 text-[11px] uppercase tracking-[0.3em] text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Description</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                    <th scope="col" className="px-4 py-3 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-background/95">
                  {loading && (
                    <tr>
                      <td className="px-4 py-3 text-muted" colSpan={3}>
                        Loading transactions...
                      </td>
                    </tr>
                  )}
                  {!loading && usageHistory.length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-muted" colSpan={3}>
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    usageHistory.map((entry) => (
                      <tr key={entry.id} className="transition hover:bg-background/80">
                        <td className="px-4 py-3 text-foreground">{entry.label}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {entry.amount > 0 ? '+' : ''}
                          {entry.amount} credits
                        </td>
                        <td className="px-4 py-3 text-muted">{entry.timestamp}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
