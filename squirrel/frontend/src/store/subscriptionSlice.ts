import type { StateCreator } from 'zustand';
import { BillingApi } from '../lib/api/billing';
import { isAuthenticated } from '../features/auth/useAuthStore';
import type {
  PricingPlan,
  SubscriptionSummary,
  PaymentRecord,
  SubscriptionPlanId,
  BillingCycle,
  PaymentGateway,
} from '../types/subscription';
import type { AppState } from './types';

export interface SubscriptionSlice {
  plans: PricingPlan[];
  subscription: SubscriptionSummary | null;
  recentPayments: PaymentRecord[];
  loadingPlans: boolean;
  loadingSubscription: boolean;
  upgradeModalOpen: boolean;
  selectedPlan: SubscriptionPlanId;
  selectedCycle: BillingCycle;
  selectedGateway: PaymentGateway;
  subscriptionFeedback: { kind: 'success' | 'error'; message: string } | null;
  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  setPlanChoice: (plan: SubscriptionPlanId, cycle?: BillingCycle) => void;
  setGateway: (gateway: PaymentGateway) => void;
  toggleUpgradeModal: (open: boolean) => void;
  changePlan: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  clearSubscriptionFeedback: () => void;
}

export const createSubscriptionSlice: StateCreator<AppState, [['zustand/immer', never]], [], SubscriptionSlice> = (
  set,
  get,
  _api,
) => ({
  plans: [],
  subscription: null,
  recentPayments: [],
  loadingPlans: false,
  loadingSubscription: false,
  upgradeModalOpen: false,
  selectedPlan: 'pro',
  selectedCycle: 'monthly',
  selectedGateway: 'paynow',
  subscriptionFeedback: null,
  async fetchPlans() {
    if (!isAuthenticated()) {
      set((state) => {
        state.plans = [];
        state.loadingPlans = false;
      });
      return;
    }
    set((state) => {
      state.loadingPlans = true;
    });
    try {
      const plans = await BillingApi.getPlans();
      set((state) => {
        state.plans = plans;
        state.loadingPlans = false;
        if (state.subscriptionFeedback?.kind === 'error') {
          state.subscriptionFeedback = null;
        }
      });
    } catch (error) {
      console.error(error);
      set((state) => {
        state.loadingPlans = false;
        state.subscriptionFeedback = {
          kind: 'error',
          message: 'We could not load the latest plans. Please refresh and try again.',
        };
      });
    }
  },
  async fetchSubscription() {
    if (!isAuthenticated()) {
      set((state) => {
        state.loadingSubscription = false;
        state.subscription = null;
        state.recentPayments = [];
      });
      return;
    }
    set((state) => {
      state.loadingSubscription = true;
    });
    try {
      const { subscription, payments } = await BillingApi.getSubscription();
      set((state) => {
        state.subscription = subscription ?? null;
        state.recentPayments = payments ?? [];
        state.loadingSubscription = false;
        if (state.subscriptionFeedback?.kind === 'error') {
          state.subscriptionFeedback = null;
        }
        if (subscription) {
          state.selectedPlan = subscription.plan;
          state.selectedCycle = subscription.renewalCycle;
          state.selectedGateway = subscription.gateway;
        }
      });
    } catch (error) {
      console.error(error);
      set((state) => {
        state.loadingSubscription = false;
        state.subscriptionFeedback = {
          kind: 'error',
          message: 'Billing information failed to load. Check your connection and retry.',
        };
      });
    }
  },
  setPlanChoice(plan, cycle) {
    set((state) => {
      state.selectedPlan = plan;
      if (cycle) {
        state.selectedCycle = cycle;
      }
    });
  },
  setGateway(gateway) {
    set((state) => {
      state.selectedGateway = gateway;
    });
  },
  toggleUpgradeModal(open) {
    set((state) => {
      state.upgradeModalOpen = open;
    });
  },
  async changePlan() {
    if (!isAuthenticated()) {
      return;
    }
    set((state) => {
      state.loadingSubscription = true;
    });
    try {
      const result = await BillingApi.changePlan({
        plan: get().selectedPlan,
        cycle: get().selectedCycle,
        gateway: get().selectedGateway,
      });
      if (result && 'redirectUrl' in result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      await get().fetchSubscription();
      set((state) => {
        state.subscriptionFeedback = {
          kind: 'success',
          message: 'Your subscription has been updated.',
        };
      });
    } catch (error) {
      console.error(error);
      set((state) => {
        state.loadingSubscription = false;
        state.subscriptionFeedback = {
          kind: 'error',
          message: 'We could not update your plan. Please try again shortly.',
        };
      });
    }
  },
  async cancelSubscription() {
    if (!isAuthenticated()) {
      return;
    }
    try {
      set((state) => {
        state.loadingSubscription = true;
      });
      await BillingApi.cancelSubscription();
      await get().fetchSubscription();
      set((state) => {
        state.subscriptionFeedback = {
          kind: 'success',
          message: 'Your subscription was cancelled. You can rejoin any time.',
        };
      });
    } catch (error) {
      console.error(error);
      set((state) => {
        state.loadingSubscription = false;
        state.subscriptionFeedback = {
          kind: 'error',
          message: 'We could not cancel your subscription. Please contact support if this continues.',
        };
      });
    }
  },
  clearSubscriptionFeedback() {
    set((state) => {
      state.subscriptionFeedback = null;
    });
  },
});
