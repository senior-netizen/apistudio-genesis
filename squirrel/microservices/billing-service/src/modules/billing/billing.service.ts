import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../config/redis.service';
import { FeatureGateService } from '../../shared/services/feature-gate.service';
import { CreditsService } from '../credits/credits.service';
import { PlansService } from '../plans/plans.service';
import { PaynowService } from '../paynow/paynow.service';
import { ChangePlanDto, PlanRequestType } from '../plans/dto/change-plan.dto';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly plansService: PlansService,
    private readonly creditsService: CreditsService,
    private readonly featureGateService: FeatureGateService,
    private readonly paynowService: PaynowService,
    private readonly usageService: UsageService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe('billing.plan.changed', (message) => {
      this.logger.log(`Billing plan change propagated: ${message}`);
    });
  }

  async updatePlan(payload: UpdatePlanDto) {
    const targetId = payload.organizationId ?? payload.userId;
    if (!targetId) {
      throw new Error('Either organizationId or userId must be provided');
    }

    const targetLabel = payload.organizationId ? 'organization' : 'user';
    this.logger.log(`Updating plan to ${payload.plan} for ${targetLabel} ${targetId}`);
    const changeRequest: ChangePlanDto = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      plan: (payload.plan as string).toUpperCase() as PlanRequestType,
    };
    const response = await this.plansService.changePlan(changeRequest);
    await this.redisService.publish('billing.plan.changed', {
      ...payload,
      target: targetLabel,
      targetId,
    });
    return response;
  }

  async adjustCredits(payload: AdjustCreditsDto) {
    const targetId = payload.organizationId ?? payload.userId;
    if (!targetId) {
      throw new Error('Either organizationId or userId must be provided');
    }

    const targetLabel = payload.organizationId ? 'organization' : 'user';
    this.logger.log(`Adjusting credits by ${payload.amount} for ${targetLabel} ${targetId}`);
    const result = payload.organizationId
      ? await this.creditsService.addOrganizationCredits(payload.organizationId, payload.amount, 'manual_adjustment')
      : await this.creditsService.addCredits(payload.userId as string, payload.amount, 'manual_adjustment');
    await this.redisService.publish('billing.credits.adjusted', {
      ...payload,
      target: targetLabel,
      targetId,
    });
    return { state: result, currency: this.configService.get('BILLING_CURRENCY', 'USD') };
  }

  async checkFeature(
    target: { userId?: string; organizationId?: string },
    feature: string,
    creditCost = 0,
  ) {
    if (target.organizationId) {
      await this.featureGateService.assertOrganizationFeatureAccess(
        target.organizationId,
        feature,
        creditCost,
      );
      return { allowed: true, scope: 'organization', organizationId: target.organizationId };
    }

    if (!target.userId) {
      throw new Error('Either organizationId or userId must be provided');
    }

    await this.featureGateService.assertFeatureAccess(target.userId, feature, creditCost);
    return { allowed: true };
  }

  async mockTopUpCredits(userId: string, amount: number, reference?: string) {
    return this.paynowService.simulateTopUp({ userId, amount, reference });
  }

  async mockActivatePro(userId: string) {
    return this.paynowService.simulateActivatePro(userId);
  }

  async getOrganizationBillingState(organizationId: string) {
    const state = await this.creditsService.ensureOrganizationState(organizationId);
    const planState = await this.plansService.getOrganizationPlan(organizationId);
    return {
      organizationId,
      plan: planState?.currentPlan ?? planState?.currentPlanId ?? 'FREE',
      creditsBalance: state.creditsBalance,
      renewDate: state.renewDate ?? null,
      status: state.status,
    };
  }

  async getOrganizationUsage(organizationId: string) {
    return this.usageService.findForOrganization(organizationId, {});
  }
}
