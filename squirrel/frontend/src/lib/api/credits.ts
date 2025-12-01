import { api } from '../../services/api';

export type CreditsOverview = {
  balance: number;
  planId: string | null;
  status: string;
  usage: Array<{ id: string; type: string; amount: number; metadata?: Record<string, unknown> | null; createdAt: string }>;
};

export const CreditsApi = {
  getUserCredits(userId: string) {
    return api.get<CreditsOverview>(`/v1/billing/credits/${userId}`).then((res) => res.data);
  },
};
