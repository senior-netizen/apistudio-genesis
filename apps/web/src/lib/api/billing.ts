import type {
  PricingPlan,
  SubscriptionSummary,
  PaymentRecord,
  RevenueSnapshot,
  SubscriptionPlanId,
  BillingCycle,
  PaymentGateway,
} from '../../types/subscription';
import { apiFetch } from './client';

type FetchOptions = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
};

async function fetchJson<T>(path: string, options?: FetchOptions): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  if (response.status === 204) {
    return null as T;
  }
  return response.json() as Promise<T>;
}

export const BillingApi = {
  async getPaymentSecurityContext(): Promise<{ nonce: string; csrfToken: string }> {
    return fetchJson('/payments/security-context');
  },
  getPlans(): Promise<PricingPlan[]> {
    return fetchJson('/plans');
  },
  getSubscription(): Promise<{ subscription: SubscriptionSummary | null; payments: PaymentRecord[] }> {
    return fetchJson('/subscriptions/me');
  },
  async changePlan(payload: { plan: SubscriptionPlanId; cycle: BillingCycle; gateway: PaymentGateway }) {
    const security = await BillingApi.getPaymentSecurityContext();
    const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    return fetchJson('/subscriptions/me', {
      method: 'PATCH',
      headers: {
        'x-csrf-token': security.csrfToken,
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({ ...payload, nonce: security.nonce, idempotencyKey }),
    });
  },
  cancelSubscription() {
    return fetchJson('/subscriptions/me/cancel', { method: 'POST' });
  },
  revenue(): Promise<RevenueSnapshot> {
    return fetchJson('/admin/analytics/billing');
  },
};
