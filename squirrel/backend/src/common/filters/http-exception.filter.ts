import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLogger } from '../../infra/logger/app-logger.service';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
  meta: Record<string, unknown>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const { status, code, message, details } = this.normalizeException(exception);

    const payload: ErrorEnvelope = {
      success: false,
      error: {
        code,
        message,
        statusCode: status,
      },
      meta: {
        path: request.url,
        method: request.method,
        requestId: request.requestId ?? request.headers['x-request-id'],
        timestamp: new Date().toISOString(),
        details,
      },
    };

    this.logger.error(payload.error.message, exception instanceof Error ? exception.stack : undefined, HttpExceptionFilter.name);
    response.status(status).json(payload);
  }

  private normalizeException(exception: unknown) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message = this.extractMessage(response) ?? exception.message;
      const code = this.extractCode(response, exception.name);
      const details = this.extractDetails(response);
      return { status: exception.getStatus(), code, message, details } as const;
    }

    const fallbackMessage = exception instanceof Error ? exception.message : 'Internal server error';
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: fallbackMessage, details: undefined } as const;
  }

  private extractMessage(response: unknown): string | undefined {
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const payload = response as Record<string, unknown>;
      if (Array.isArray(payload.message)) {
        return payload.message.join(', ');
      }
      return typeof payload.message === 'string' ? payload.message : undefined;
    }
    return undefined;
  }

  private extractCode(response: unknown, fallback: string): string {
    if (response && typeof response === 'object' && 'code' in response && typeof (response as any).code === 'string') {
      return (response as any).code;
    }
    return fallback
      .replace(/Exception$/, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toUpperCase();
  }

  private extractDetails(response: unknown): unknown {
    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      return payload.errors ?? payload.details;
    }
    return undefined;
  }
}
