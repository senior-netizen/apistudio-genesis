import { Button, Card } from '@sdl/ui';
import type { PricingPlan, SubscriptionPlanId } from '../../types/subscription';

interface PricingTierCardProps {
  plan: PricingPlan;
  activePlan?: SubscriptionPlanId;
  onSelect: (plan: PricingPlan) => void;
}

export function PricingTierCard({ plan, activePlan, onSelect }: PricingTierCardProps) {
  const isActive = plan.id === activePlan;
  return (
    <Card
      className={`flex h-full flex-col justify-between border transition ${
        isActive
          ? 'border-foreground/70 bg-foreground/5 shadow-lg shadow-foreground/10'
          : 'border-border/60 bg-background/80 hover:border-foreground/40'
      }`}
    >
      <div className="space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">{plan.bestFor}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{plan.title}</h3>
          <p className="mt-1 text-sm text-muted">{plan.description}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground">${plan.priceMonthly}</span>
          <span className="text-xs uppercase tracking-[0.3em] text-muted">/ month</span>
        </div>
        <ul className="space-y-2 text-sm text-muted">
          {plan.features.map((feature) => (
            <li key={feature.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
              <span>{feature.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-6">
        <Button onClick={() => onSelect(plan)} variant={isActive ? 'primary' : 'outline'} className="w-full">
          {isActive ? 'Current plan' : 'Choose plan'}
        </Button>
      </div>
    </Card>
  );
}

export default PricingTierCard;
