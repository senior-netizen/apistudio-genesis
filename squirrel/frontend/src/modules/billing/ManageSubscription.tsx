import type { PaymentRecord, SubscriptionSummary } from '../../types/subscription';
import SubscriptionSummaryCard from '../../components/billing/SubscriptionSummary';

interface ManageSubscriptionProps {
  subscription: SubscriptionSummary | null;
  payments: PaymentRecord[];
  onCancel: () => Promise<void>;
  busy?: boolean;
}

export function ManageSubscription({ subscription, payments, onCancel, busy = false }: ManageSubscriptionProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/40 bg-background/80 p-8 shadow-lg shadow-black/5">
        <SubscriptionSummaryCard subscription={subscription} payments={payments} onCancel={onCancel} busy={busy} />
      </div>
    </div>
  );
}

export default ManageSubscription;
