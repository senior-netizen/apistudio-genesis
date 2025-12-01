import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ConflictException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['idempotency-key'];
    if (!key || typeof key !== 'string') {
      return next.handle();
    }
    const redis = await this.redisService.getClient();
    const redisKey = `idempotency:${key}`;

    return from(
      (redis as any).set(redisKey, 'locked', 'EX', 60 * 5, 'NX').then((result: unknown) => {
        if (result === null) {
          throw new ConflictException({
            code: 'IDEMPOTENT_REPLAY',
            message: 'This operation has already been processed.',
          });
        }
        return result;
      }),
    ).pipe(
      mergeMap(() =>
        next.handle().pipe(
          mergeMap(async (response) => {
            await (redis as any).set(redisKey, JSON.stringify(response), 'EX', 60 * 60, 'XX');
            return response;
          }),
        ),
      ),
    );
  }
}
