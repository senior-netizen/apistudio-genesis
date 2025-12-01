import { request } from './client';

export interface BillingPlanResponse {
  plan: string;
  status: string;
  renewsOn?: string;
  limits?: Record<string, string | number>;
}

export interface BillingUsageEvent {
  id: string;
  type: string;
  createdAt: string;
  description?: string;
  amount?: number;
}

export interface BillingUsageResponse {
  remainingCredits?: number;
  recentEvents: BillingUsageEvent[];
}

export const getPlan = async (): Promise<BillingPlanResponse> => {
  return request<BillingPlanResponse>({
    url: '/api/billing/me/plan',
    method: 'GET'
  });
};

export const getUsage = async (): Promise<BillingUsageResponse> => {
  return request<BillingUsageResponse>({
    url: '/api/billing/me/usage',
    method: 'GET'
  });
};
