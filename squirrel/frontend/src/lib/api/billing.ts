import type {
  PricingPlan,
  SubscriptionSummary,
  PaymentRecord,
  RevenueSnapshot,
  SubscriptionPlanId,
  BillingCycle,
  PaymentGateway,
} from '../../types/subscription';
import { api } from '../../services/api';

export const BillingApi = {
  async getPaymentSecurityContext(): Promise<{ nonce: string; csrfToken: string }> {
    const response = await api.post<{ nonce: string; csrfToken: string }>('/v1/payments/security-context');
    return response.data;
  },
  async getPlans(): Promise<PricingPlan[]> {
    const response = await api.get<PricingPlan[]>('/v1/plans');
    return response.data ?? [];
  },
  async getSubscription(): Promise<{ subscription: SubscriptionSummary | null; payments: PaymentRecord[] }> {
    const response = await api.get<{ subscription: SubscriptionSummary | null; payments: PaymentRecord[] }>(
      '/v1/subscriptions/me',
    );
    return {
      subscription: response.data?.subscription ?? null,
      payments: response.data?.payments ?? [],
    };
  },
  async changePlan(payload: { plan: SubscriptionPlanId; cycle: BillingCycle; gateway: PaymentGateway }) {
    const security = await BillingApi.getPaymentSecurityContext();
    const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const response = await api.patch('/v1/subscriptions/me', {
      ...payload,
      nonce: security.nonce,
      idempotencyKey,
    }, {
      headers: {
        'x-csrf-token': security.csrfToken,
        'idempotency-key': idempotencyKey,
      },
    });
    return response.data;
  },
  async cancelSubscription() {
    await api.post('/v1/subscriptions/me/cancel');
  },
  async revenue(): Promise<RevenueSnapshot> {
    const response = await api.get<RevenueSnapshot>('/v1/admin/analytics/billing');
    return response.data;
  },
};
