import type { BillingCycle, PaymentGateway, PricingPlan } from '../../types/subscription';
import UpgradeModal from '../../components/billing/UpgradeModal';

interface CheckoutModalProps {
  open: boolean;
  plans: PricingPlan[];
  selectedPlan: PricingPlan | null;
  cycle: BillingCycle;
  gateway: PaymentGateway;
  busy?: boolean;
  onClose: () => void;
  onPlanSelect: (plan: PricingPlan) => void;
  onCycleChange: (cycle: BillingCycle) => void;
  onGatewayChange: (gateway: PaymentGateway) => void;
  onConfirm: () => Promise<void>;
}

export function CheckoutModal(props: CheckoutModalProps) {
  return <UpgradeModal {...props} />;
}

export default CheckoutModal;
