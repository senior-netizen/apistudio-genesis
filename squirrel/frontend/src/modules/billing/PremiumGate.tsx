import type { ReactNode } from 'react';
import { useAppStore } from '../../store';
import { UpgradePrompt } from './UpgradePrompt';

type Plan = 'free' | 'pro' | 'enterprise';

interface PremiumGateProps {
  requiredPlan: Plan;
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const PLAN_ORDER: Plan[] = ['free', 'pro', 'enterprise'];

export function PremiumGate({ requiredPlan, feature, children, fallback }: PremiumGateProps) {
  const subscription = useAppStore((state) => state.subscription);
  const activePlan = subscription?.plan ?? 'free';

  if (PLAN_ORDER.indexOf(activePlan) < PLAN_ORDER.indexOf(requiredPlan)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <UpgradePrompt requiredPlan={requiredPlan === 'free' ? 'pro' : requiredPlan} feature={feature} />;
  }

  return <>{children}</>;
}

export default PremiumGate;
