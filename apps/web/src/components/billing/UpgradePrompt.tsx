import { Button, Card } from '@sdl/ui';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store';

interface UpgradePromptProps {
  requiredPlan: 'pro' | 'enterprise';
  feature: string;
}

export function UpgradePrompt({ requiredPlan, feature }: UpgradePromptProps) {
  const { toggleUpgradeModal, setPlanChoice } = useAppStore((state) => ({
    toggleUpgradeModal: state.toggleUpgradeModal,
    setPlanChoice: state.setPlanChoice,
  }));

  return (
    <Card className="border border-dashed border-border/60 bg-background/80 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Upgrade required</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Unlock {feature}</h3>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {requiredPlan === 'enterprise'
              ? 'Invite your team, automate compliance, and ship white-label experiences tailored to enterprise workflows.'
              : 'Level up with Copilot, analytics, and unlimited requests to go from idea to production in record time.'}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setPlanChoice(requiredPlan);
            toggleUpgradeModal(true);
          }}
        >
          Upgrade to {requiredPlan}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

export default UpgradePrompt;
