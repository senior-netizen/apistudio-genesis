import { Injectable, Logger } from '@nestjs/common';
import { CreditsService } from '../credits/credits.service';
import { PlansService } from '../plans/plans.service';

interface TopUpDto {
  userId: string;
  amount: number;
  reference?: string;
}

@Injectable()
export class PaynowService {
  private readonly logger = new Logger(PaynowService.name);

  constructor(
    private readonly creditsService: CreditsService,
    private readonly plansService: PlansService,
  ) {}

  async simulateTopUp(payload: TopUpDto) {
    this.logger.log(`Simulating Paynow top-up for ${payload.userId} with ${payload.amount} credits`);
    const state = await this.creditsService.addCredits(
      payload.userId,
      payload.amount,
      payload.reference ?? 'paynow_topup',
    );
    return {
      status: 'credited',
      provider: 'paynow',
      reference: payload.reference ?? `paynow-${Date.now()}`,
      state,
      note: 'Replace this with the real Paynow payment confirmation flow.',
    };
  }

  async simulateActivatePro(userId: string) {
    this.logger.log(`Simulating Paynow PRO activation for ${userId}`);
    const plan = await this.plansService.getPlanByName('PRO');
    if (!plan) {
      throw new Error('PRO plan not configured');
    }
    await this.plansService.updateUserPlan(userId, plan.id);
    return {
      status: 'pending_activation',
      provider: 'paynow',
      message: 'PRO plan activation simulated. Hook real Paynow subscription logic here.',
    };
  }
}
