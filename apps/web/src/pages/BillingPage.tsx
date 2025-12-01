import Loading from '../components/Loading';
import { Suspense, useState } from 'react';
import MySubscriptionPage from './MySubscriptionPage';
import CreditsWalletPage from './CreditsWalletPage';
import { NeonTabBar } from '../components/system';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'credits'>('subscriptions');

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Billing</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Subscriptions & Credits</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Manage your subscription plan, reconcile invoices, and top up usage credits without leaving the studio.
        </p>
      </header>
      <div className="space-y-4">
        <NeonTabBar
          tabs={[
            {
              id: 'subscriptions',
              label: 'Subscriptions',
              active: activeTab === 'subscriptions',
              onSelect: () => setActiveTab('subscriptions'),
            },
            {
              id: 'credits',
              label: 'Credits wallet',
              active: activeTab === 'credits',
              onSelect: () => setActiveTab('credits'),
            },
          ]}
        />

        {activeTab === 'subscriptions' && (
          <Suspense fallback={<Loading label="subscription" inCard />}>
            <MySubscriptionPage />
          </Suspense>
        )}
        {activeTab === 'credits' && (
          <Suspense fallback={<Loading label="credits" inCard />}>
            <CreditsWalletPage />
          </Suspense>
        )}
      </div>
    </section>
  );
}
