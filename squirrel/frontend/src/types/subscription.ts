export type SubscriptionPlanId = 'free' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type PaymentGateway = 'paynow';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'canceled';

export interface PlanFeature {
  id: string;
  label: string;
}

export interface PricingPlan {
  id: SubscriptionPlanId;
  title: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  features: PlanFeature[];
  bestFor: string;
}

export interface SubscriptionSummary {
  plan: SubscriptionPlanId;
  status: SubscriptionStatus;
  gateway: PaymentGateway;
  nextBillingDate?: string;
  currentPeriodEnd?: string;
  renewalCycle: BillingCycle;
}

export interface PaymentRecord {
  reference: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  status: string;
  paidAt?: string;
}

export interface RevenueSnapshot {
  totalRevenue: number;
  mrr: number;
  churnRate: number;
  activeSubscriptions: number;
  failedPayments: number;
  activeByGateway: Array<{ gateway: string; count: number }>;
  gatewayHealth: Record<string, { successRate: number | null; latencyMs: number | null }>;
  currencyBreakdown: Array<{ currency: string; _sum: { amount: number } }>;
}
