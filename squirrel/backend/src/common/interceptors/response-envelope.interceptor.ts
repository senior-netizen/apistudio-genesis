import { Injectable, NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

interface SuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { requestId?: string }>();

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        const envelope: SuccessEnvelope = {
          success: true,
          data: data ?? null,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            requestId: request.requestId ?? request.headers['x-request-id'],
          },
        };

        return envelope;
      }),
    );
  }
}
