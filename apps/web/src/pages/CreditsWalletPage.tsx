import { Card } from '@sdl/ui';
import { ArrowUpRight, Clock3, Coins, PlusCircle, TrendingUp } from 'lucide-react';
import BuyCreditsModal from '../components/BuyCreditsModal';
import { useToast } from '../components/ui/toast';

const usageHistory = [
  { id: 'txn-001', label: 'AI Assistant run', amount: -45, timestamp: '2 hours ago' },
  { id: 'txn-002', label: 'Hub subscription renewal', amount: -120, timestamp: 'Yesterday' },
  { id: 'txn-003', label: 'Plugin marketplace', amount: -250, timestamp: '3 days ago' },
  { id: 'txn-004', label: 'Credits top-up', amount: 1000, timestamp: 'Last week' }
];

export default function CreditsWalletPage() {
  const { push: pushToast } = useToast();
  const monthlyAllocation = 2000;
  const remainingCredits = 1200;
  const usedCredits = monthlyAllocation - remainingCredits;
  const usagePercent = Math.round((usedCredits / monthlyAllocation) * 100);
  const averageDailySpend = Math.round(usedCredits / 7);
  const projectedRunRate = usagePercent > 0 ? Math.round((usedCredits / usagePercent) * 100) : 0;
  const creditLevel = remainingCredits >= 1000 ? 'healthy' : remainingCredits >= 500 ? 'monitor' : 'critical';
  const creditLevelCopy = creditLevel === 'healthy' ? 'Healthy balance' : creditLevel === 'monitor' ? 'Monitor usage' : 'Top up soon';

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Credits · Billing · Usage</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Squirrel Credits</h1>
            <p className="text-sm text-muted">
              Manage balance, review transactions, and keep your workflows running without interruptions.
            </p>
          </div>
          <BuyCreditsModal
            onPurchase={(amount) =>
              pushToast({
                title: 'Credits purchase requested',
                description: `${amount.toLocaleString()} credits will be processed shortly`,
                variant: 'success',
              })
            }
            triggerLabel="Add credits"
            triggerClassName="w-full sm:w-auto"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Card className="relative overflow-hidden rounded-[20px] border border-border/40 bg-background/95 p-6 shadow-glass">
            <div
              className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-accent/20 via-background/60 to-transparent backdrop-blur"
              aria-hidden
            />
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-muted">
                  <Coins className="h-3.5 w-3.5 text-accent" aria-hidden /> Balance overview
                </div>
                <div>
                  <p className="text-sm text-muted">Current balance</p>
                  <div className="mt-1 text-5xl font-semibold tracking-tight text-foreground">{remainingCredits.toLocaleString()}</div>
                  <p className="text-sm text-muted">of {monthlyAllocation.toLocaleString()} allocated this cycle</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium uppercase tracking-[0.3em] ${
                      creditLevel === 'healthy'
                        ? 'bg-success/10 text-success'
                        : creditLevel === 'monitor'
                          ? 'bg-warning/15 text-warning'
                          : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {creditLevelCopy}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 uppercase tracking-[0.3em]">
                    {usagePercent}% used
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 uppercase tracking-[0.3em]">
                    {usedCredits.toLocaleString()} consumed
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-[12px] border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border hover:bg-background/70"
                  >
                    <PlusCircle className="h-4 w-4 text-accent" aria-hidden /> Top up
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-[12px] border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border hover:bg-background/70"
                  >
                    <TrendingUp className="h-4 w-4 text-accent" aria-hidden /> Usage
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-[12px] border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border hover:bg-background/70"
                  >
                    <Clock3 className="h-4 w-4 text-accent" aria-hidden /> History
                  </button>
                </div>
              </div>
              <div className="flex h-full w-full max-w-xs flex-col gap-4 rounded-[16px] border border-border/50 bg-background/90 p-5">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted">
                  Usage this cycle
                  <span className="font-semibold text-foreground">{usagePercent}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-border/40">
                  <div className="h-3 rounded-full bg-accent" style={{ width: `${usagePercent}%` }} />
                </div>
                <p className="text-xs text-muted">
                  {usedCredits.toLocaleString()} credits used across requests, realtime sessions, and automation triggers.
                </p>
                <button
                  type="button"
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-[12px] border border-border/60 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border hover:bg-background/80"
                >
                  View usage breakdown
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-5 rounded-[16px] border border-border/60 bg-background/95 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Insights</p>
                <h2 className="text-lg font-semibold text-foreground">Usage overview</h2>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex items-center justify-between rounded-[12px] border border-border/50 bg-background/90 px-4 py-3">
                <span>Average daily spend</span>
                <span className="text-base font-semibold text-foreground">{averageDailySpend} credits</span>
              </div>
              <div className="flex items-center justify-between rounded-[12px] border border-border/50 bg-background/90 px-4 py-3">
                <span>Projected run rate</span>
                <span className="text-base font-semibold text-foreground">~{projectedRunRate} credits</span>
              </div>
              <div className="rounded-[12px] border border-border/60 bg-background/80 px-4 py-3 text-xs">
                Stay above 500 credits to keep AI-assisted debugging and deployment automations running in real time.
              </div>
            </div>
          </Card>
        </div>

        <Card className="space-y-6 rounded-[18px] border border-border/60 bg-background/95 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Usage history</p>
              <h2 className="text-lg font-semibold text-foreground">Transactions</h2>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[12px] border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition hover:border-border hover:bg-background/80"
            >
              Export CSV
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="overflow-hidden rounded-[16px] border border-border/60">
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full divide-y divide-border/50 text-left text-sm">
                <thead className="sticky top-0 bg-background/90 text-[11px] uppercase tracking-[0.3em] text-muted backdrop-blur">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Description</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Amount</th>
                    <th scope="col" className="px-5 py-3 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-background/95">
                  {usageHistory.map((entry) => (
                    <tr key={entry.id} className="transition hover:bg-background/85">
                      <td className="px-5 py-4 text-foreground">{entry.label}</td>
                      <td className={`px-5 py-4 font-medium ${entry.amount >= 0 ? 'text-success' : 'text-foreground'}`}>
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount} credits
                      </td>
                      <td className="px-5 py-4 text-muted">{entry.timestamp}</td>
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
