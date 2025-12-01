import { useEffect, useMemo } from 'react';
import { Button } from '@sdl/ui';
import type { PricingPlan } from '../../types/subscription';
import { useAppStore } from '../../store';
import { CheckoutModal } from './CheckoutModal';
import { ManageSubscription } from './ManageSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { PremiumGate } from './PremiumGate';

export function SubscriptionPage() {
  const {
    subscription,
    recentPayments,
    fetchSubscription,
    fetchPlans,
    plans,
    selectedPlan,
    selectedCycle,
    selectedGateway,
    setPlanChoice,
    setGateway,
    upgradeModalOpen,
    toggleUpgradeModal,
    changePlan,
    cancelSubscription,
    loadingSubscription,
  } = useAppStore((state) => ({
    subscription: state.subscription,
    recentPayments: state.recentPayments,
    fetchSubscription: state.fetchSubscription,
    fetchPlans: state.fetchPlans,
    plans: state.plans,
    selectedPlan: state.selectedPlan,
    selectedCycle: state.selectedCycle,
    selectedGateway: state.selectedGateway,
    setPlanChoice: state.setPlanChoice,
    setGateway: state.setGateway,
    upgradeModalOpen: state.upgradeModalOpen,
    toggleUpgradeModal: state.toggleUpgradeModal,
    changePlan: state.changePlan,
    cancelSubscription: state.cancelSubscription,
    loadingSubscription: state.loadingSubscription,
  }));

  useEffect(() => {
    void fetchSubscription();
    void fetchPlans();
  }, [fetchSubscription, fetchPlans]);

  const planLookup = useMemo(() => new Map<PricingPlan['id'], PricingPlan>(plans.map((plan) => [plan.id, plan])), [plans]);
  const selectedPlanDetail = planLookup.get(selectedPlan) ?? null;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-zinc-950 via-slate-900 to-black p-12 text-white shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12)_0,_rgba(0,0,0,0)_60%)]" aria-hidden />
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Billing</p>
            <h1 className="text-4xl font-semibold tracking-tight">Subscription &amp; billing</h1>
            <p className="max-w-2xl text-sm text-white/70">
              Manage your plan, monitor renewals, and explore gateways with a calm, Apple-inspired control center designed for focus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="rounded-full border border-white/20 px-3 py-1 uppercase tracking-[0.3em]">
              {subscription?.plan ?? 'free'} plan
            </span>
            {subscription?.gateway && (
              <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.3em]">
                Gateway: {subscription.gateway}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              className="bg-white/10 text-white backdrop-blur hover:bg-white/20"
              onClick={() => {
                setPlanChoice(subscription?.plan ?? 'pro', subscription?.renewalCycle);
                toggleUpgradeModal(true);
              }}
              disabled={loadingSubscription}
            >
              {subscription ? 'Change plan' : 'Explore plans'}
            </Button>
            {subscription && (
              <Button
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
                onClick={() => {
                  void cancelSubscription();
                }}
                disabled={loadingSubscription}
              >
                Cancel plan
              </Button>
            )}
          </div>
        </div>
      </section>

      <ManageSubscription subscription={subscription} payments={recentPayments} onCancel={cancelSubscription} />

      <PremiumGate requiredPlan="pro" feature="AI copilots & analytics">
        <UpgradePrompt requiredPlan="enterprise" feature="Executive analytics & SLA" />
      </PremiumGate>

      <CheckoutModal
        open={upgradeModalOpen}
        onClose={() => toggleUpgradeModal(false)}
        plans={plans}
        selectedPlan={selectedPlanDetail}
        cycle={selectedCycle}
        onCycleChange={(cycle) => setPlanChoice(selectedPlan, cycle)}
        onPlanSelect={(plan) => setPlanChoice(plan.id)}
        gateway={selectedGateway}
        onGatewayChange={setGateway}
        onConfirm={async () => {
          await changePlan();
          toggleUpgradeModal(false);
        }}
        busy={loadingSubscription}
      />
    </div>
  );
}

export default SubscriptionPage;
