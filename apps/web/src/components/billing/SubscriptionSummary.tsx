import { Button, Card } from '@sdl/ui';
import { format } from 'date-fns';
import type { PaymentRecord, SubscriptionSummary as SubscriptionSummaryData } from '../../types/subscription';

interface SubscriptionSummaryProps {
  subscription: SubscriptionSummaryData | null;
  payments: PaymentRecord[];
  onCancel: () => Promise<void>;
}

export function SubscriptionSummary({ subscription, payments, onCancel }: SubscriptionSummaryProps) {
  if (!subscription) {
    return (
      <Card className="border border-dashed border-border/60 p-6 text-sm text-muted">
        You do not have an active subscription yet. Choose a plan to unlock premium tooling.
      </Card>
    );
  }

  const nextRenewal = subscription.nextBillingDate
    ? format(new Date(subscription.nextBillingDate), 'PPP')
    : 'Not scheduled';

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 bg-background/80 p-6 shadow-inner">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Current plan</p>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{subscription.plan.toUpperCase()}</h3>
            <p className="text-sm text-muted">Gateway: {subscription.gateway.toUpperCase()} • Renewal: {subscription.renewalCycle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {subscription.status}
            </div>
            <Button variant="outline" onClick={onCancel}>
              Cancel subscription
            </Button>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 md:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Next renewal</dt>
            <dd className="text-sm text-foreground">{nextRenewal}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Billing cycle</dt>
            <dd className="text-sm text-foreground">{subscription.renewalCycle}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Status</dt>
            <dd className="text-sm capitalize text-foreground">{subscription.status}</dd>
          </div>
        </dl>
      </Card>

      <Card className="border border-border/60 bg-background/70 p-6">
        <h4 className="text-lg font-semibold tracking-tight text-foreground">Recent payments</h4>
        <div className="mt-4 space-y-3 text-sm">
          {payments.length === 0 ? (
            <p className="text-muted">No payments recorded yet.</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.reference} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/40 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{payment.currency} {payment.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted">{payment.gateway.toUpperCase()} • {payment.reference}</p>
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-muted">
                  {payment.status}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default SubscriptionSummary;
