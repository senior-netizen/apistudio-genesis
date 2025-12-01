import type { StateCreator } from '@/vendor/zustand';
import { BillingApi } from '../lib/api/billing';
import type {
  PricingPlan,
  SubscriptionSummary,
  PaymentRecord,
  SubscriptionPlanId,
  BillingCycle,
  PaymentGateway,
} from '../types/subscription';
import { useAuthStore } from '../modules/auth/authStore';
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
  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  setPlanChoice: (plan: SubscriptionPlanId, cycle?: BillingCycle) => void;
  setGateway: (gateway: PaymentGateway) => void;
  toggleUpgradeModal: (open: boolean) => void;
  changePlan: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

const isAuthenticated = () => useAuthStore.getState().isAuthenticated;

export const createSubscriptionSlice: StateCreator<AppState, [], [], SubscriptionSlice> = (set, get) => ({
  plans: [],
  subscription: null,
  recentPayments: [],
  loadingPlans: false,
  loadingSubscription: false,
  upgradeModalOpen: false,
  selectedPlan: 'pro',
  selectedCycle: 'monthly',
  selectedGateway: 'paynow',
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
      });
    } catch (error) {
      console.error(error);
      set((state) => {
        state.loadingPlans = false;
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
      if (result && typeof result === 'object' && 'redirectUrl' in result) {
        const redirectUrl = (result as { redirectUrl?: string }).redirectUrl;
        if (typeof redirectUrl === 'string' && redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
      }
      await get().fetchSubscription();
    } catch (error) {
      console.error(error);
      set((state) => {
        state.loadingSubscription = false;
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
    } catch (error) {
      console.error(error);
      set((state) => {
        state.loadingSubscription = false;
      });
    }
  },
});
