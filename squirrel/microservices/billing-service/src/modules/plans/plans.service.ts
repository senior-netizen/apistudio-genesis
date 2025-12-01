import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillingPlanEntity,
  OrganizationBillingStateEntity,
  UserBillingStateEntity,
} from '../../shared/entities';
import { DEFAULT_PLAN_DEFINITIONS, getDefaultCreditsForPlan } from '../../shared/constants/default-plans';
import { CreditsService } from '../credits/credits.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(BillingPlanEntity)
    private readonly planRepository: Repository<BillingPlanEntity>,
    @InjectRepository(UserBillingStateEntity)
    private readonly stateRepository: Repository<UserBillingStateEntity>,
    @InjectRepository(OrganizationBillingStateEntity)
    private readonly organizationStateRepository: Repository<OrganizationBillingStateEntity>,
    private readonly creditsService: CreditsService,
  ) {}

  async onModuleInit() {
    for (const plan of DEFAULT_PLAN_DEFINITIONS) {
      const existing = await this.planRepository.findOne({ where: { name: plan.name } });
      if (!existing) {
        await this.planRepository.save(
          this.planRepository.create({
            name: plan.name,
            limits: plan.limits,
            monthlyPrice: plan.monthlyPrice,
          }),
        );
        this.logger.log(`Seeded billing plan ${plan.name}`);
      }
    }
  }

  listPlans() {
    return this.planRepository.find();
  }

  async getPlanByName(name: string) {
    return this.planRepository.findOne({ where: { name } });
  }

  getPlanInitialCredits(plan: BillingPlanEntity) {
    return getDefaultCreditsForPlan(plan.name);
  }

  async getUserPlan(userId: string) {
    const state = await this.stateRepository.findOne({ where: { userId }, relations: ['currentPlan'] });
    if (!state) {
      return null;
    }
    if (!state.currentPlan && state.currentPlanId) {
      state.currentPlan = await this.planRepository.findOne({ where: { id: state.currentPlanId } });
    }
    return state;
  }

  async updateUserPlan(userId: string, planId: string | null) {
    let state = await this.stateRepository.findOne({ where: { userId } });
    if (!state) {
      state = this.stateRepository.create({ userId, creditsBalance: 0, status: 'active' });
    }
    state.currentPlanId = planId;
    await this.stateRepository.save(state);
    return state;
  }

  async getOrganizationPlan(organizationId: string) {
    const state = await this.organizationStateRepository.findOne({
      where: { organizationId },
      relations: ['currentPlan'],
    });
    if (!state) {
      return null;
    }
    if (!state.currentPlan && state.currentPlanId) {
      state.currentPlan = await this.planRepository.findOne({ where: { id: state.currentPlanId } });
    }
    return state;
  }

  async updateOrganizationPlan(organizationId: string, planId: string | null) {
    let state = await this.organizationStateRepository.findOne({ where: { organizationId } });
    if (!state) {
      state = this.organizationStateRepository.create({
        organizationId,
        creditsBalance: 0,
        status: 'active',
      });
    }
    state.currentPlanId = planId;
    await this.organizationStateRepository.save(state);
    return state;
  }

  async changePlan(payload: ChangePlanDto) {
    if (!payload.userId && !payload.organizationId) {
      throw new Error('Either organizationId or userId must be provided');
    }
    const plan = await this.getPlanByName(payload.plan);
    if (!plan) {
      this.logger.warn(`Plan ${payload.plan} requires manual activation`);
      return {
        status: 'manual_required',
        message: `Plan ${payload.plan} requires founder approval before activation`,
      };
    }

    if (payload.organizationId) {
      await this.updateOrganizationPlan(payload.organizationId, plan.id);
      const defaultCredits = getDefaultCreditsForPlan(plan.name);
      if (defaultCredits > 0) {
        await this.creditsService.addOrganizationCredits(
          payload.organizationId,
          defaultCredits,
          'plan_change',
        );
      }
      this.logger.log(`Changed plan for organization ${payload.organizationId} to ${plan.name}`);
    }

    if (payload.userId) {
      await this.updateUserPlan(payload.userId, plan.id);
      const defaultCredits = getDefaultCreditsForPlan(plan.name);
      if (defaultCredits > 0) {
        await this.creditsService.addCredits(payload.userId, defaultCredits, 'plan_change');
      }
      this.logger.log(`Changed plan for user ${payload.userId} to ${plan.name}`);
    }

    return {
      status: 'updated',
      plan: payload.plan,
    };
  }
}
