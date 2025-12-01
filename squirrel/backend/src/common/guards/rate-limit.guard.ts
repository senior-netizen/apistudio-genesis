import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RedisService } from '../../infra/redis/redis.service';
import { ConfigType } from '@nestjs/config';
import appConfig from '../../config/configuration';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly redisService: RedisService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.id ?? 'anon';
    const route = request.route?.path ?? request.path;
    const clientIp = request.ip || (Array.isArray(request.ips) && request.ips.length ? request.ips[0] : 'unknown');
    // For unauthenticated users, ignore workspace header to avoid easy key inflation
    const workspaceHeader = request.headers['x-workspace-id'];
    const workspaceId = request.user?.id ? workspaceHeader?.toString() : undefined;
    const key = this.buildKey(userId, workspaceId, route, clientIp);

    if (!this.config.redis.enabled) {
      // Dev mode without Redis: allow and set permissive headers
      this.setHeaders(request.res, {
        limit: this.config.rateLimit.maxRequests.toString(),
        remaining: this.config.rateLimit.maxRequests.toString(),
        reset: Math.ceil((Date.now() + this.config.rateLimit.windowSec * 1000) / 1000).toString(),
      });
      return true;
    }

    const client = await this.redisService.getClient();
    const now = Date.now();
    const window = this.config.rateLimit.windowSec * 1000;
    const cutoff = now - window;

    const multi = client.multi();
    multi.zremrangebyscore(key, 0, cutoff);
    multi.zadd(key, now, now.toString());
    multi.zcard(key);
    multi.expire(key, this.config.rateLimit.windowSec);
    const [, , count] = (await multi.exec()) ?? [];
    const total = Array.isArray(count) ? Number(count[1]) : Number(count);
    if (Number.isNaN(total)) {
      this.logger.warn({ msg: 'Rate limiter failed to parse count', count });
      return true;
    }

    if (total > this.config.rateLimit.maxRequests) {
      throw new ForbiddenException({
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please retry later.',
      });
    }

    this.setHeaders(request.res, {
      limit: this.config.rateLimit.maxRequests.toString(),
      remaining: Math.max(this.config.rateLimit.maxRequests - total, 0).toString(),
      reset: Math.ceil((now + window) / 1000).toString(),
    });

    return true;
  }

  private buildKey(userId: string, workspaceId: string | undefined, route: string | undefined, clientIp: string) {
    // Bind anonymous traffic to IP; authenticated users bind to userId
    const principal = userId === 'anon' ? `ip:${clientIp}` : `user:${userId}`;
    return ['rate', principal, workspaceId ?? 'global', route ?? 'unknown'].join(':');
  }

  private setHeaders(
    res: Response | undefined,
    values: { limit: string; remaining: string; reset: string },
  ) {
    if (!res || res.headersSent) {
      return;
    }
    res.setHeader('x-rate-limit-limit', values.limit);
    res.setHeader('x-rate-limit-remaining', values.remaining);
    res.setHeader('x-rate-limit-reset', values.reset);
  }
}
