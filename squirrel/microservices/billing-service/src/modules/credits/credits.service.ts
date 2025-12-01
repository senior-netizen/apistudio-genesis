import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BillingPlanEntity,
  OrganizationBillingStateEntity,
  UserBillingStateEntity,
} from '../../shared/entities';
import { getDefaultCreditsForPlan } from '../../shared/constants/default-plans';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    @InjectRepository(UserBillingStateEntity)
    private readonly stateRepository: Repository<UserBillingStateEntity>,
    @InjectRepository(BillingPlanEntity)
    private readonly planRepository: Repository<BillingPlanEntity>,
    @InjectRepository(OrganizationBillingStateEntity)
    private readonly organizationStateRepository: Repository<OrganizationBillingStateEntity>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => UsageService))
    private readonly usageService: UsageService,
  ) {}

  private async getOrCreateState(manager: EntityManager, userId: string) {
    let state = await manager.findOne(UserBillingStateEntity, { where: { userId } });
    if (!state) {
      const planRepo = manager.getRepository(BillingPlanEntity);
      const freePlan = await planRepo.findOne({ where: { name: 'FREE' } });
      state = manager.create(UserBillingStateEntity, {
        userId,
        currentPlanId: freePlan?.id,
        creditsBalance: freePlan ? getDefaultCreditsForPlan(freePlan.name) : 0,
        status: 'active',
      });
      if (freePlan) {
        state.currentPlan = freePlan;
      }
      await manager.save(state);
    }
    return state;
  }

  async ensureUserState(userId: string) {
    return this.getOrCreateState(this.stateRepository.manager, userId);
  }

  private async getOrCreateOrganizationState(manager: EntityManager, organizationId: string) {
    let state = await manager.findOne(OrganizationBillingStateEntity, { where: { organizationId } });
    if (!state) {
      const planRepo = manager.getRepository(BillingPlanEntity);
      const freePlan = await planRepo.findOne({ where: { name: 'FREE' } });
      state = manager.create(OrganizationBillingStateEntity, {
        organizationId,
        currentPlanId: freePlan?.id ?? null,
        creditsBalance: freePlan ? getDefaultCreditsForPlan(freePlan.name) : 0,
        status: 'active',
      });
      if (freePlan) {
        state.currentPlan = freePlan;
      }
      await manager.save(state);
    }
    return state;
  }

  async ensureOrganizationState(organizationId: string) {
    return this.getOrCreateOrganizationState(this.organizationStateRepository.manager, organizationId);
  }

  async addCredits(userId: string, amount: number, reason: string) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserBillingStateEntity);
      const state = await this.getOrCreateState(manager, userId);
      state.creditsBalance += amount;
      await repository.save(state);
      await this.usageService.recordUsage({
        userId,
        type: 'credits.added',
        amount,
        metadata: { reason },
      });
      this.logger.log(`Added ${amount} credits to user ${userId} for ${reason}`);
      return state;
    });
  }

  async addOrganizationCredits(organizationId: string, amount: number, reason: string) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(OrganizationBillingStateEntity);
      const state = await this.getOrCreateOrganizationState(manager, organizationId);
      state.creditsBalance += amount;
      await repository.save(state);
      await this.usageService.recordUsage({
        organizationId,
        type: 'credits.added',
        amount,
        metadata: { reason },
      });
      this.logger.log(`Added ${amount} credits to organization ${organizationId} for ${reason}`);
      return state;
    });
  }

  async deductCredits(
    userId: string,
    amount: number,
    type: string,
    metadata?: Record<string, unknown>,
  ) {
    if (amount < 0) {
      throw new Error('Amount must be zero or positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserBillingStateEntity);
      const state = await this.getOrCreateState(manager, userId);

      if (state.creditsBalance < amount) {
        throw new Error('Not enough credits');
      }

      state.creditsBalance -= amount;
      await repository.save(state);
      await this.usageService.recordUsage({
        userId,
        type,
        amount,
        metadata,
      });
      this.logger.debug(`Deducted ${amount} credits from user ${userId} for ${type}`);
      return state;
    });
  }

  async deductOrganizationCredits(
    organizationId: string,
    amount: number,
    type: string,
    metadata?: Record<string, unknown>,
  ) {
    if (amount < 0) {
      throw new Error('Amount must be zero or positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(OrganizationBillingStateEntity);
      const state = await this.getOrCreateOrganizationState(manager, organizationId);

      if (state.creditsBalance < amount) {
        throw new Error('Not enough credits');
      }

      state.creditsBalance -= amount;
      await repository.save(state);
      await this.usageService.recordUsage({
        organizationId,
        type,
        amount,
        metadata,
      });
      this.logger.debug(`Deducted ${amount} credits from organization ${organizationId} for ${type}`);
      return state;
    });
  }

  async recordUsageOnly(
    userId: string,
    amount: number,
    type: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.ensureUserState(userId);
    return this.usageService.recordUsage({ userId, amount, type, metadata });
  }

  async recordOrganizationUsage(
    organizationId: string,
    amount: number,
    type: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.ensureOrganizationState(organizationId);
    return this.usageService.recordUsage({ organizationId, amount, type, metadata });
  }

  async getCreditsOverview(userId: string) {
    const state = await this.ensureUserState(userId);
    const events = await this.usageService.listUserEvents(userId, 50);
    return {
      balance: state.creditsBalance,
      planId: state.currentPlanId,
      status: state.status,
      usage: events.map((event) => ({
        id: event.id,
        type: event.type,
        amount: event.amount,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })),
    };
  }

  async setPlan(userId: string, planId: string | null) {
    const state = await this.ensureUserState(userId);
    state.currentPlanId = planId;
    if (planId) {
      const plan = await this.planRepository.findOne({ where: { id: planId } });
      if (plan) {
        state.currentPlan = plan;
      }
    }
    return this.stateRepository.save(state);
  }
}
