import { Inject, Injectable, Logger, OnModuleInit, forwardRef } from '@nestjs/common';
import { RedisService } from '../../../config/redis.service';
import { CreditsService } from '../../credits/credits.service';

interface UsagePayload {
  userId: string;
  type: string;
  amount: number;
  metadata?: Record<string, unknown>;
  deductCredits?: boolean;
}

@Injectable()
export class UsageEventsListener implements OnModuleInit {
  private readonly logger = new Logger(UsageEventsListener.name);

  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => CreditsService))
    private readonly creditsService: CreditsService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe('billing.usage.record', async (message) => {
      try {
        const payload: UsagePayload = typeof message === 'string' ? JSON.parse(message) : message;
        if (!payload?.userId || !payload?.type) {
          this.logger.warn(`Skipping invalid usage payload: ${JSON.stringify(message)}`);
          return;
        }

        const amount = Number(payload.amount ?? 0);

        if (payload.deductCredits) {
          await this.creditsService.deductCredits(
            payload.userId,
            amount,
            payload.type,
            payload.metadata,
          );
        } else {
          await this.creditsService.recordUsageOnly(
            payload.userId,
            amount,
            payload.type,
            payload.metadata,
          );
        }
      } catch (error) {
        this.logger.error('Failed to process usage payload', error as Error);
      }
    });
  }
}
