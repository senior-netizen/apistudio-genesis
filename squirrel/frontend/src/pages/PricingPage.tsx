import { useEffect } from 'react';
import { Card } from '@sdl/ui';
import { useAppStore } from '../store';
import PricingTierCard from '../components/billing/PricingTierCard';
import UpgradeModal from '../components/billing/UpgradeModal';
import type { PricingPlan } from '../types/subscription';

export function PricingPage() {
  const {
    plans,
    fetchPlans,
    fetchSubscription,
    subscription,
    selectedPlan,
    selectedCycle,
    selectedGateway,
    setPlanChoice,
    setGateway,
    upgradeModalOpen,
    toggleUpgradeModal,
    changePlan,
  } = useAppStore((state) => ({
    plans: state.plans,
    fetchPlans: state.fetchPlans,
    fetchSubscription: state.fetchSubscription,
    subscription: state.subscription,
    selectedPlan: state.selectedPlan,
    selectedCycle: state.selectedCycle,
    selectedGateway: state.selectedGateway,
    setPlanChoice: state.setPlanChoice,
    setGateway: state.setGateway,
    upgradeModalOpen: state.upgradeModalOpen,
    toggleUpgradeModal: state.toggleUpgradeModal,
    changePlan: state.changePlan,
  }));

  useEffect(() => {
    void fetchPlans();
    void fetchSubscription();
  }, [fetchPlans, fetchSubscription]);

  const activePlan = subscription?.plan ?? 'free';
  const planLookup = new Map<PricingPlan['id'], PricingPlan>(plans.map((plan) => [plan.id, plan]));
  const selectedPlanDetail = planLookup.get(selectedPlan) ?? null;

  return (
    <section className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Pricing</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Scale with Squirrel API Studio</h1>
        <p className="max-w-2xl text-sm text-muted">
          Start for free, add AI copilots and analytics on Pro, and unlock enterprise collaboration with white-label workspaces and
          advanced governance controls.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingTierCard
            key={plan.id}
            plan={plan}
            activePlan={activePlan}
            onSelect={(next) => {
              setPlanChoice(next.id, 'monthly');
              toggleUpgradeModal(true);
            }}
          />
        ))}
      </div>

      <Card className="border border-border/60 bg-background/80 p-6 text-sm text-muted">
        <p>
          Need a tailored rollout, offline license keys, or continent-wide deployment support? Drop us a message at{' '}
          <a className="text-foreground" href="mailto:enterprise@squirrel.africa">
            enterprise@squirrel.africa
          </a>{' '}
          and our team will curate a bespoke plan.
        </p>
      </Card>

      <UpgradeModal
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
      />
    </section>
  );
}

export default PricingPage;
