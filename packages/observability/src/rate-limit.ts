import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from './context';
import type { StructuredLogger } from './logger';

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSec?: number;
  limit?: number;
  remaining?: number;
  reason?: string;
}

export interface RateLimitProvider {
  (request: Request, key: string): Promise<RateLimitDecision>;
}

export interface RateLimitMiddlewareOptions {
  logger: StructuredLogger;
  headerPrefix?: string;
  onError?: (error: unknown) => void;
  provider: RateLimitProvider;
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  const headerPrefix = options.headerPrefix ?? 'x-rate-limit';
  return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const context = getRequestContext();
    const fallbackIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const contextualKeyParts = [fallbackIp, context?.orgId, context?.workspaceId].filter((value): value is string => Boolean(value));
    const contextualKey = contextualKeyParts.join(':') || fallbackIp;
    try {
      const decision = await options.provider(req, contextualKey);
      res.setHeader(`${headerPrefix}-key`, contextualKey);
      if (decision.limit != null) {
        res.setHeader(`${headerPrefix}-limit`, String(decision.limit));
      }
      if (decision.remaining != null) {
        res.setHeader(`${headerPrefix}-remaining`, String(decision.remaining));
      }
      if (decision.retryAfterSec != null) {
        res.setHeader('retry-after', String(decision.retryAfterSec));
      }
      if (!decision.allowed) {
        options.logger.warn({ contextualKey, reason: decision.reason }, 'rate limit triggered');
        res.status(429).json({ code: 'RATE_LIMITED', message: decision.reason ?? 'Too many requests', retryAfterSec: decision.retryAfterSec });
        return;
      }
      next();
    } catch (error) {
      options.onError?.(error);
      options.logger.warn({ error }, 'rate limit provider failed, continuing request');
      next();
    }
  };
}
