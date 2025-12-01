import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { v4 as uuid } from 'uuid';

/**
 * LoggingInterceptor centralizes request logging for the gateway. It enriches
 * each request with a correlation id (x-request-id) so that downstream
 * services, logs, and clients can trace execution across boundaries.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('GatewayRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { user?: Record<string, unknown> }>();
    const response = httpContext.getResponse();

    const startTime = Date.now();
    const existingCorrelationId = request.headers['x-request-id'] as string | undefined;
    const correlationId = existingCorrelationId?.toString() || uuid();

    request.headers['x-request-id'] = correlationId;
    if (typeof response.setHeader === 'function') {
      response.setHeader('x-request-id', correlationId);
    }

    const logRequest = (statusCode: number, error?: unknown) => {
      const user = request.user || {};
      const userId = (user['id'] || user['sub'] || 'anonymous') as string;
      const duration = Date.now() - startTime;
      const message = `${request.method} ${request.originalUrl} ${statusCode} ` +
        `${duration}ms user=${userId} requestId=${correlationId}`;

      if (error) {
        this.logger.error(message, error instanceof Error ? error.stack : undefined);
      } else {
        this.logger.log(message);
      }
    };

    return next.handle().pipe(
      tap(() => logRequest(response.statusCode ?? 200)),
      catchError((error) => {
        const statusCode = (error && typeof error === 'object' && 'status' in error
          ? (error as { status?: number }).status
          : undefined) ?? response.statusCode ?? 500;
        logRequest(statusCode, error);
        return throwError(() => error);
      }),
    );
  }
}

