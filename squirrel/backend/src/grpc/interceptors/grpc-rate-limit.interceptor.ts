import { CallHandler, ExecutionContext, Injectable, NestInterceptor, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, from, map } from 'rxjs';
import { RedisService } from '../../infra/redis/redis.service';
import { Metadata } from '@grpc/grpc-js';

type InMemoryCounter = { count: number; resetAt: number };

@Injectable()
export class GrpcRateLimitInterceptor implements NestInterceptor {
  private readonly memoryCounters = new Map<string, InMemoryCounter>();

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rpcContext = context.switchToRpc();
    const metadata = rpcContext.getContext<Metadata>();
    const user = (metadata as any).__user as { id?: string } | undefined;
    const peer = (metadata as any).getMap ? metadata.getMap().peer : undefined;
    const windowSec = this.config.get<number>('app.rateLimit.windowSec', 60);
    const maxRequests = this.config.get<number>('app.rateLimit.maxRequests', 600);
    const key = user?.id ? `grpc:user:${user.id}` : `grpc:peer:${peer ?? 'anonymous'}`;

    return from(this.increment(key, windowSec)).pipe(
      map((currentCount) => {
        if (currentCount > maxRequests) {
          throw new HttpException({
            code: 'RATE_LIMITED',
            message: 'gRPC rate limit exceeded',
          }, HttpStatus.TOO_MANY_REQUESTS);
        }
        return currentCount;
      }),
      map(() => next.handle()),
    );
  }

  private async increment(key: string, windowSec: number): Promise<number> {
    try {
      const client = await this.redis.getClient();
      const result = await client.multi().incr(key).expire(key, windowSec, 'NX').exec();
      const value = result?.[0]?.[1];
      if (typeof value === 'number') {
        return value;
      }
    } catch (error) {
      // Fallback to in-memory counter if Redis is disabled/unavailable.
    }

    const now = Date.now();
    const record = this.memoryCounters.get(key);
    if (!record || record.resetAt < now) {
      this.memoryCounters.set(key, { count: 1, resetAt: now + windowSec * 1000 });
      return 1;
    }
    record.count += 1;
    return record.count;
  }
}
