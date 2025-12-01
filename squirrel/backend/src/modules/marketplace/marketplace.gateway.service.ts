import { Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MarketplaceRequestContext } from './marketplace-api-key.middleware';

@Injectable()
export class MarketplaceGatewayService {
  constructor(private readonly prisma: PrismaService) {}

  async proxy(apiId: string, req: Request, context: MarketplaceRequestContext) {
    if (!context || context.apiKey.apiId !== apiId) {
      throw new NotFoundException({ code: 'API_KEY_SCOPE', message: 'API key does not grant access to this API' });
    }
    const baseUrl = context.api.baseUrl;
    const pathParam = typeof req.query.path === 'string' ? req.query.path : '';
    const targetUrl = this.resolveUrl(baseUrl, pathParam);
    this.appendQueryParams(targetUrl, req.query);
    const method = req.method.toUpperCase();
    const requestHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (['host', 'content-length', 'x-api-key'].includes(key.toLowerCase())) continue;
      if (Array.isArray(value)) {
        requestHeaders[key] = value.join(',');
      } else {
        requestHeaders[key] = value;
      }
    }
    let body: any;
    const requestContentType =
      typeof req.headers['content-type'] === 'string'
        ? req.headers['content-type']
        : typeof req.headers['Content-Type'] === 'string'
        ? req.headers['Content-Type']
        : undefined;
    if (!['GET', 'HEAD'].includes(method)) {
      const contentType = requestContentType;
      if (Buffer.isBuffer(req.body)) {
        body = req.body;
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else if (typeof req.body === 'object' && req.body !== null) {
        body = JSON.stringify(req.body);
        if (!contentType) {
          requestHeaders['content-type'] = 'application/json';
        }
      }
    }
    const started = Date.now();
    try {
      const response = (await fetch(targetUrl.toString(), {
        method,
        headers: requestHeaders,
        body,
        redirect: 'manual',
      })) as Response;
      const duration = Date.now() - started;
      const buffer = Buffer.from(await response.arrayBuffer());
      await this.recordUsage(context.apiKey.id, {
        method,
        url: targetUrl.toString(),
        status: response.status,
        durationMs: duration,
        error: null,
      });
      const upstreamHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        upstreamHeaders[key] = value;
      });
      const headerInterface = response.headers as Headers & { getSetCookie?: () => string[] };
      const setCookies =
        typeof headerInterface.getSetCookie === 'function' ? headerInterface.getSetCookie() : [];
      return {
        status: response.status,
        headers: upstreamHeaders,
        cookies: setCookies as string[],
        body: buffer,
      };
    } catch (error) {
      const duration = Date.now() - started;
      await this.recordUsage(context.apiKey.id, {
        method,
        url: targetUrl.toString(),
        status: null,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: 502,
        headers: { 'content-type': 'application/json' },
        cookies: [] as string[],
        body: Buffer.from(
          JSON.stringify({ code: 'API_UPSTREAM_ERROR', message: 'Failed to reach upstream API', detail: String(error) }),
        ),
      };
    }
  }

  private resolveUrl(baseUrl: string, path: string) {
    if (!path || path === '/') {
      return new URL(baseUrl);
    }
    try {
      return new URL(path, baseUrl);
    } catch (error) {
      return new URL(baseUrl);
    }
  }

  private appendQueryParams(target: URL, params: Record<string, unknown>) {
    for (const [key, value] of Object.entries(params)) {
      if (key === 'path') continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          target.searchParams.append(key, String(v));
        }
      } else if (value !== undefined) {
        target.searchParams.append(key, String(value));
      }
    }
  }

  private async recordUsage(
    apiKeyId: string,
    entry: { method: string; url: string; status: number | null; durationMs: number; error: string | null },
  ) {
    try {
      await Promise.all([
        this.prisma.apiKey.update({
          where: { id: apiKeyId },
          data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
        }),
        this.prisma.apiUsageLog.create({
          data: {
            apiKeyId,
            method: entry.method,
            url: entry.url,
            status: entry.status ?? undefined,
            durationMs: entry.durationMs,
            error: entry.error ?? undefined,
          },
        }),
      ]);
    } catch (error) {
      // Avoid blocking the response pipeline if analytics logging fails.
      // eslint-disable-next-line no-console
      console.warn('Failed to persist marketplace usage log', error);
    }
  }
}
