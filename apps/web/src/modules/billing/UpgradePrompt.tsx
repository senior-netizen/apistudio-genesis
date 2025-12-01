import { ArrowRight } from 'lucide-react';
import { Button } from '@sdl/ui';
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
    <div className="overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-slate-900 via-black to-slate-950 p-8 text-white shadow-xl shadow-black/30">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Premium feature</p>
          <h3 className="text-3xl font-semibold tracking-tight">
            Upgrade to unlock {feature}
          </h3>
          <p className="max-w-xl text-sm text-white/70">
            {requiredPlan === 'enterprise'
              ? 'Empower your teams with governance, SLA-backed support, and white-label developer experiences built for scale.'
              : 'Access neural analytics, Copilot automation, and limitless workspaces with a single upgrade.'}
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          onClick={() => {
            setPlanChoice(requiredPlan);
            toggleUpgradeModal(true);
          }}
        >
          Upgrade to {requiredPlan}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export default UpgradePrompt;
