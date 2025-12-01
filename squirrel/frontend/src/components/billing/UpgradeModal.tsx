import { Button, Card } from '@sdl/ui';
import { X } from 'lucide-react';
import type { PricingPlan, BillingCycle, PaymentGateway } from '../../types/subscription';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  plans: PricingPlan[];
  selectedPlan: PricingPlan | null;
  cycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
  onPlanSelect: (plan: PricingPlan) => void;
  gateway: PaymentGateway;
  onGatewayChange: (gateway: PaymentGateway) => void;
  onConfirm: () => Promise<void>;
  busy?: boolean;
}

export function UpgradeModal({
  open,
  onClose,
  plans,
  selectedPlan,
  cycle,
  onCycleChange,
  onPlanSelect,
  gateway,
  onGatewayChange,
  onConfirm,
  busy,
}: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <Card className="relative w-full max-w-3xl border border-border/60 bg-background/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-border/40 p-2 text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Close</span>
        </button>
        <div className="space-y-6">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Upgrade</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {selectedPlan ? `Activate ${selectedPlan.title}` : 'Choose a plan'}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Select your billing cadence and preferred payment gateway. Zimbabwean payments are supported out of the box.
            </p>
          </header>

          <div className="flex flex-wrap gap-3">
            {(['monthly', 'annual'] as BillingCycle[]).map((option) => (
              <Button
                key={option}
                variant={cycle === option ? 'primary' : 'outline'}
                onClick={() => onCycleChange(option)}
              >
                {option === 'monthly' ? 'Monthly billing' : 'Annual billing (save 15%)'}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isActive = selectedPlan?.id === plan.id;
              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => onPlanSelect(plan)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive ? 'border-foreground/70 bg-foreground/5 shadow-lg' : 'border-border/40 hover:border-foreground/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted">{plan.bestFor}</p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{plan.title}</h3>
                    </div>
                    {isActive && <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">Selected</span>}
                  </div>
                  <p className="mt-3 text-sm text-muted">{plan.description}</p>
                </button>
              );
            })}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">Payment method</h3>
            <div className="mt-3">
              <PaymentMethodSelector value={gateway} onChange={onGatewayChange} />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted">
              By continuing, you authorize Squirrel API Studio to bill your selected gateway on a recurring {cycle} basis. You can
              cancel anytime.
            </p>
            <Button onClick={onConfirm} disabled={!selectedPlan || busy} variant="primary">
              {busy ? 'Processing…' : selectedPlan ? `Confirm ${selectedPlan.title}` : 'Confirm upgrade'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default UpgradeModal;
