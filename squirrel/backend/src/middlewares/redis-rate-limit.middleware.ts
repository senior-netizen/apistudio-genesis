import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { createRateLimitMiddleware } from '@squirrel/observability';
import { AppLogger } from '../infra/logger/app-logger.service';
import { REDIS_CLIENT } from '../infrastructure/redis/redis.tokens';

@Injectable()
export class RedisRateLimitMiddleware implements NestMiddleware {
  private readonly delegate: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis, appLogger: AppLogger) {
    this.delegate = createRateLimitMiddleware({
      logger: appLogger.raw,
      provider: async (_req, key) => {
        const windowSec = 15 * 60;
        const max = 100;
        const results = await this.redis.multi().incr(key).expire(key, windowSec).exec();
        const count = Number(results?.[0]?.[1] ?? 0);
        return {
          allowed: count <= max,
          limit: max,
          remaining: Math.max(max - count, 0),
          retryAfterSec: count > max ? windowSec : undefined,
          reason: count > max ? 'ip_or_tenant_limit' : undefined,
        };
      },
      onError: (error) => appLogger.raw.warn({ error }, 'rate limit provider error'),
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    await this.delegate(req, res, next);
  }
}
