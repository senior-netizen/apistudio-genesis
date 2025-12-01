import Loading from '../components/Loading';
import { Suspense } from 'react';
import MySubscriptionPage from './MySubscriptionPage';
import CreditsWalletPage from './CreditsWalletPage';

export default function BillingPage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Billing</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Subscriptions & Credits</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Manage your subscription plan, reconcile invoices, and top up usage credits without leaving the studio.
        </p>
      </header>
      <Suspense fallback={<Loading label="subscription" inCard />}>
        <MySubscriptionPage />
      </Suspense>
      <Suspense fallback={<Loading label="credits" inCard />}>
        <CreditsWalletPage />
      </Suspense>
    </section>
  );
}

