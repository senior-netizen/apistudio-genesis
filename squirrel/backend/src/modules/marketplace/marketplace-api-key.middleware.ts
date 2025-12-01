import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { createHash } from 'crypto';
import { ConfigType } from '@nestjs/config';
import appConfig from '../../config/configuration';

@Injectable()
export class MarketplaceApiKeyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MarketplaceApiKeyMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      return next();
    }
    const apiId = req.params['apiId'];
    const rawKey = (req.headers['x-api-key'] as string | undefined)?.trim();
    if (!apiId || !rawKey) {
      res.status(401).json({ code: 'API_KEY_REQUIRED', message: 'API key is required for marketplace access' });
      return;
    }
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash, revoked: false, apiId, status: 'active' },
      include: { plan: true, api: true },
    });
    if (!apiKey) {
      res.status(401).json({ code: 'API_KEY_INVALID', message: 'Invalid or inactive API key' });
      return;
    }
    const plan = apiKey.plan;
    const api = apiKey.api;
    if (!plan || !api) {
      res.status(500).json({ code: 'MARKETPLACE_KEY_ERROR', message: 'API key metadata incomplete' });
      return;
    }
    if (this.config.redis.enabled) {
      try {
        const client = await this.redis.getClient();
        const now = Date.now();
        const minuteKey = `ratelimit:apikey:${apiKey.id}:minute:${Math.floor(now / 60000)}`;
        const burstKey = `ratelimit:apikey:${apiKey.id}:burst`;
        const results = await client
          .multi()
          .incr(minuteKey)
          .expire(minuteKey, 60)
          .incr(burstKey)
          .expire(burstKey, 1)
          .exec();
        const minuteCount = Number(results?.[0]?.[1] ?? 0);
        const burstCount = Number(results?.[2]?.[1] ?? 0);
        if (minuteCount > plan.rateLimitPerMinute || burstCount > plan.burstLimit) {
          res.status(429).json({
            code: 'API_RATE_LIMITED',
            message: 'Rate limit exceeded for this API key. Try again shortly.',
          });
          return;
        }
      } catch (error) {
        this.logger.warn(`Marketplace rate limit fallback: ${error instanceof Error ? error.message : error}`);
      }
    }
    (req as any).marketplace = {
      apiKey: {
        id: apiKey.id,
        apiId: apiKey.apiId,
        subscriberUserId: apiKey.subscriberUserId,
        status: apiKey.status,
        usageCount: apiKey.usageCount,
        planId: apiKey.planId,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        rateLimitPerMinute: plan.rateLimitPerMinute,
        burstLimit: plan.burstLimit,
      },
      api: {
        id: api.id,
        baseUrl: api.baseUrl,
      },
    } as MarketplaceRequestContext;
    next();
  }
}

export type MarketplaceRequestContext = {
  apiKey: {
    id: string;
    apiId: string;
    subscriberUserId: string;
    status: string;
    usageCount: number;
    planId: string;
  };
  plan: {
    id: string;
    name: string;
    rateLimitPerMinute: number;
    burstLimit: number;
  };
  api: {
    id: string;
    baseUrl: string;
  };
};
