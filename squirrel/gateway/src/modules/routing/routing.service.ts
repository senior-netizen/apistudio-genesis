import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { randomBytes } from 'crypto';

interface ServiceRoute {
  prefixes: string[];
  envKey: string;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly routes: ServiceRoute[] = [
    { prefixes: ['auth'], envKey: 'AUTH_SERVICE_URL' },
    { prefixes: ['users'], envKey: 'USER_SERVICE_URL' },
    { prefixes: ['orgs', 'organizations', 'teams'], envKey: 'ORGANIZATION_SERVICE_URL' },
    { prefixes: ['workspaces'], envKey: 'WORKSPACE_SERVICE_URL' },
    { prefixes: ['request', 'runner'], envKey: 'API_RUNNER_SERVICE_URL' },
    { prefixes: ['ai'], envKey: 'AI_SERVICE_URL' },
    { prefixes: ['billing'], envKey: 'BILLING_SERVICE_URL' },
    { prefixes: ['notifications'], envKey: 'NOTIFICATIONS_SERVICE_URL' },
    { prefixes: ['logs'], envKey: 'LOGS_SERVICE_URL' },
  ];

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async forward(req: Request & { internalKey?: string }, res: Response) {
    // Short-circuit CSRF token without hitting downstream services
    if (this.isCsrfPath(req.originalUrl)) {
      const csrfToken = randomBytes(32).toString('hex');
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false,
        secure: (process.env.NODE_ENV ?? 'development') === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      res.json({ csrfToken });
      return;
    }

    const pathAfterPrefix = req.originalUrl.replace(/^\/api/, '');
    const [pathOnly, queryString] = pathAfterPrefix.split('?');
    const serviceMatch = this.resolveService(
      pathOnly + (queryString ? `?${queryString}` : ''),
      queryString ? `?${queryString}` : '',
    );

    if (serviceMatch === undefined) {
      const legacyTarget = this.configService.get<string>('LEGACY_BACKEND_URL');
      if (legacyTarget) {
        const fallbackPath = req.originalUrl.startsWith('/') ? req.originalUrl : `/${req.originalUrl}`;
        return this.forwardToTarget(req, res, { target: legacyTarget, pathSuffix: fallbackPath });
      }

      this.logger.warn(`No route found for ${req.originalUrl}`);
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    if (serviceMatch === null) {
      res.status(502).json({ message: 'Service temporarily unavailable' });
      return;
    }

    return this.forwardToTarget(req, res, serviceMatch);
  }

  private resolveService(pathAfterPrefix: string, querySuffix: string):
    | { target: string; pathSuffix: string }
    | null
    | undefined {
    const pathOnly = pathAfterPrefix.split('?')[0] ?? '';
    const segments = pathOnly.split('/').filter(Boolean);
    if (!segments.length) {
      return undefined;
    }

    const isVersioned = /^v\d+$/i.test(segments[0]);
    const serviceSegment = isVersioned ? segments[1] : segments[0];
    if (!serviceSegment) {
      return undefined;
    }

    const match = this.routes.find((route) => route.prefixes.includes(serviceSegment));
    if (!match) {
      return undefined;
    }

    const target = this.configService.get<string>(match.envKey);
    if (!target) {
      this.logger.error(
        `Route matched for ${serviceSegment} but environment variable ${match.envKey} is not configured`,
      );
      return null;
    }

    const suffixSegments = isVersioned
      ? [segments[0], ...segments.slice(2)] // keep version, drop service segment
      : segments.slice(1); // drop service segment
    const normalizedSuffix = suffixSegments.length ? `/${suffixSegments.join('/')}` : '';
    const suffix = normalizedSuffix || '/';
    return {
      target,
      pathSuffix: `${suffix}${querySuffix}`,
    };
  }

  private async forwardToTarget(
    req: Request & { internalKey?: string },
    res: Response,
    target: { target: string; pathSuffix: string } | string,
  ): Promise<void> {
    const resolvedTarget = typeof target === 'string' ? target : target.target;
    const pathSuffix = typeof target === 'string' ? req.originalUrl.replace(/^\/api/, '') : target.pathSuffix;

    if (!resolvedTarget) {
      res.status(502).json({ message: 'Target service not configured' });
      return;
    }

    const baseUrl = resolvedTarget.endsWith('/') ? resolvedTarget : `${resolvedTarget}/`;
    const normalizedSuffix = pathSuffix.startsWith('/') ? pathSuffix.slice(1) : pathSuffix;
    const forwardUrl = new URL(normalizedSuffix, baseUrl).toString();
    const headerValue = req.headers['x-request-id'];
    const correlationId = (Array.isArray(headerValue) ? headerValue[0] : headerValue) || uuid();
    const headers = this.buildForwardHeaders(req, correlationId);

    this.logger.debug(`Forwarding ${req.method} ${req.originalUrl} to ${forwardUrl}`);

    try {
      const response = await firstValueFrom(
        this.http.request({
          url: forwardUrl,
          method: req.method as never,
          data: req.body,
          headers,
          maxBodyLength: Infinity,
          validateStatus: () => true,
        }),
      );

      this.writeResponse(res, response.status, response.headers, response.data, correlationId);
    } catch (error) {
      this.handleProxyError(error, res, correlationId);
    }
  }

  private buildForwardHeaders(req: Request & { internalKey?: string }, correlationId: string) {
    const headers: Record<string, string> = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value === undefined || key === 'host' || key === 'content-length' || key === 'connection') {
        return;
      }
      if (Array.isArray(value)) {
        headers[key] = value.join(',');
      } else {
        headers[key] = value as string;
      }
    });

    headers['x-request-id'] = correlationId || headers['x-request-id'] || '';
    if (!headers['x-request-id']) {
      delete headers['x-request-id'];
    }

    delete headers['x-internal-key'];
    const internalKey = req.internalKey ?? this.configService.get<string>('SQUIRREL_INTERNAL_KEY');
    if (internalKey) {
      headers['x-internal-key'] = internalKey;
    }

    return headers;
  }

  private writeResponse(
    res: Response,
    status: number,
    headers: Record<string, unknown>,
    data: unknown,
    correlationId: string,
  ) {
    const sanitizedHeaders = this.filterResponseHeaders(headers);
    Object.entries(sanitizedHeaders).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value as string);
      }
    });

    if (correlationId) {
      res.setHeader('x-request-id', correlationId);
    }

    res.status(status).send(data);
  }

  private filterResponseHeaders(headers: Record<string, unknown>) {
    const disallowed = new Set(['transfer-encoding', 'content-length', 'connection', 'x-internal-key']);
    const sanitized: Record<string, string> = {};
    Object.entries(headers || {}).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (disallowed.has(lowerKey)) {
        return;
      }
      if (Array.isArray(value)) {
        sanitized[lowerKey] = value.join(',');
      } else if (value !== undefined) {
        sanitized[lowerKey] = String(value);
      }
    });
    return sanitized;
  }

  private handleProxyError(error: unknown, res: Response, correlationId: string) {
    if (error instanceof AxiosError && error.response) {
      this.logger.error(
        `Downstream error ${error.response.status} for ${error.config?.url ?? 'unknown url'}`,
        error.message,
      );
      this.writeResponse(res, error.response.status, error.response.headers ?? {}, error.response.data, correlationId);
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    this.logger.error(`Gateway proxy error: ${message}`);
    res.status(502).json({ message: 'Upstream service unavailable', correlationId });
  }

  private isCsrfPath(url: string): boolean {
    const path = (url.split('?')[0] || '').replace(/\/+$/, '');
    return /^\/?(api\/)?(v\d+\/)?auth\/csrf$/.test(path);
  }
}
