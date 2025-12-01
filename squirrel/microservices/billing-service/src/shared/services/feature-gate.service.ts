import { ForbiddenException, Injectable } from '@nestjs/common';
import { DEFAULT_PLAN_DEFINITIONS } from '../constants/default-plans';
import { CreditsService } from '../../modules/credits/credits.service';
import { PlansService } from '../../modules/plans/plans.service';

@Injectable()
export class FeatureGateService {
  constructor(
    private readonly plansService: PlansService,
    private readonly creditsService: CreditsService,
  ) {}

  private getPlanLimits(planName: string) {
    return DEFAULT_PLAN_DEFINITIONS.find((plan) => plan.name === planName)?.limits ?? {};
  }

  async assertFeatureAccess(userId: string, feature: string, creditCost = 0) {
    const state = await this.plansService.getUserPlan(userId);
    if (!state?.currentPlanId && !state?.currentPlan) {
      throw new ForbiddenException('No active plan found for this user. Upgrade your plan or get more credits.');
    }

    const planName = state.currentPlan?.name ?? state.currentPlanId ?? 'FREE';
    const limits = this.getPlanLimits(planName);

    if (!this.isFeatureAllowed(limits, feature)) {
      throw new ForbiddenException('Upgrade your plan or get more credits.');
    }

    if (creditCost > 0) {
      const upToDateState = await this.creditsService.ensureUserState(userId);
      if (upToDateState.creditsBalance < creditCost) {
        throw new ForbiddenException('Upgrade your plan or get more credits.');
      }
    }

    return true;
  }

  async assertOrganizationFeatureAccess(organizationId: string, feature: string, creditCost = 0) {
    const state = await this.plansService.getOrganizationPlan(organizationId);
    if (!state?.currentPlanId && !state?.currentPlan) {
      throw new ForbiddenException(
        'No active plan found for this organization. Upgrade the plan or allocate more credits.',
      );
    }

    const planName = state.currentPlan?.name ?? state.currentPlanId ?? 'FREE';
    const limits = this.getPlanLimits(planName);

    if (!this.isFeatureAllowed(limits, feature)) {
      throw new ForbiddenException('Organization requires an upgraded plan for this feature.');
    }

    if (creditCost > 0) {
      const upToDateState = await this.creditsService.ensureOrganizationState(organizationId);
      if (upToDateState.creditsBalance < creditCost) {
        throw new ForbiddenException('Organization credits are insufficient for this feature.');
      }
    }

    return true;
  }

  private isFeatureAllowed(limits: Record<string, unknown>, feature: string) {
    switch (feature) {
      case 'ai':
        return (limits.aiCalls as number | string | undefined) !== 0;
      case 'collections':
        return (limits.collections as number | string | undefined) !== 0;
      case 'priority':
        return Boolean(limits.priority);
      default:
        return true;
    }
  }
}
