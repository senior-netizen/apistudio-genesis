import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AdminAuditService } from './admin.audit.service';
import { RedisService } from '../../config/redis.service';

export interface AdminRequestContext {
  actorId?: string;
  actorEmail?: string;
  actorRoles?: string[];
  authorization?: string;
}

export interface SystemHealthEntry {
  service: string;
  status: 'up' | 'down' | 'unknown';
  checkedAt: string;
  latencyMs?: number;
  detail?: unknown;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly audit: AdminAuditService,
    private readonly redisService: RedisService,
  ) {}

  private buildHeaders(ctx: AdminRequestContext) {
    const headers: Record<string, string> = {
      'x-internal-key': this.configService.get<string>('SQUIRREL_INTERNAL_KEY') ?? '',
    };
    if (ctx.authorization) {
      headers.Authorization = ctx.authorization;
    }
    return headers;
  }

  private async proxyRequest<T>(options: {
    serviceKey: string;
    path: string;
    method: Method;
    ctx: AdminRequestContext;
    data?: unknown;
    params?: Record<string, unknown>;
  }): Promise<T> {
    const { serviceKey, path, method, ctx, data, params } = options;
    const baseUrl = this.configService.get<string>(serviceKey);
    if (!baseUrl) {
      this.logger.error(`Missing configuration for ${serviceKey}`);
      throw new InternalServerErrorException(`Service ${serviceKey} is not configured`);
    }

    const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const requestConfig: AxiosRequestConfig = {
      url,
      method,
      data,
      params,
      headers: this.buildHeaders(ctx),
      validateStatus: () => true,
    };

    try {
      const response = await firstValueFrom(this.http.request(requestConfig));
      if (response.status >= 200 && response.status < 300) {
        return response.data as T;
      }
      this.logger.warn(`Proxy request to ${url} returned status ${response.status}`);
      throw new BadGatewayException({
        message: 'Upstream request failed',
        status: response.status,
        data: response.data,
      });
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      if (error instanceof AxiosError) {
        this.logger.error(`Proxy request to ${url} failed`, error);
        throw new BadGatewayException(error.message);
      }
      this.logger.error(`Proxy request to ${url} failed`, error as Error);
      throw new BadGatewayException('Unexpected upstream error');
    }
  }

  private async logAction(
    ctx: AdminRequestContext,
    action: string,
    target?: Record<string, unknown> | null,
    metadata?: Record<string, unknown> | null,
  ) {
    await this.audit.logAction({
      actorId: ctx.actorId,
      actorEmail: ctx.actorEmail,
      actorRoles: ctx.actorRoles,
      action,
      target: target ?? null,
      metadata: metadata ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  async listUsers(ctx: AdminRequestContext, search?: string) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'USER_SERVICE_URL',
      path: '/api/admin/users',
      method: 'GET',
      ctx,
      params: search ? { search } : undefined,
    });
    await this.logAction(ctx, 'admin.users.list', null, search ? { search } : undefined);
    return data;
  }

  async changeUserRole(ctx: AdminRequestContext, userId: string, role: string) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'USER_SERVICE_URL',
      path: `/api/admin/users/${userId}/role`,
      method: 'POST',
      ctx,
      data: { role },
    });
    await this.logAction(ctx, 'admin.users.role.change', { userId }, { role });
    return data;
  }

  async fetchRequestLogs(ctx: AdminRequestContext, type: 'requests' | 'errors' | 'ai') {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'LOGS_SERVICE_URL',
      path: `/api/admin/logs/${type}`,
      method: 'GET',
      ctx,
    });
    await this.logAction(ctx, 'admin.logs.view', null, { type });
    return data;
  }

  async fetchBillingForUser(ctx: AdminRequestContext, userId: string) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'BILLING_SERVICE_URL',
      path: `/api/admin/billing/user/${userId}`,
      method: 'GET',
      ctx,
    });
    await this.logAction(ctx, 'admin.billing.inspect', { userId });
    return data;
  }

  async adjustCredits(
    ctx: AdminRequestContext,
    userId: string,
    amount: number,
    reason?: string,
  ) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'BILLING_SERVICE_URL',
      path: `/api/admin/billing/user/${userId}/credits-adjust`,
      method: 'POST',
      ctx,
      data: { amount, reason },
    });
    await this.logAction(ctx, 'admin.billing.adjust-credits', { userId }, { amount, reason });
    return data;
  }

  async listOrganizations(ctx: AdminRequestContext) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'ORGANIZATION_SERVICE_URL',
      path: '/api/organizations',
      method: 'GET',
      ctx,
    });
    await this.logAction(ctx, 'admin.organizations.list');
    return data;
  }

  async getOrganizationMembers(ctx: AdminRequestContext, organizationId: string) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'ORGANIZATION_SERVICE_URL',
      path: `/api/organizations/${organizationId}/members`,
      method: 'GET',
      ctx,
    });
    await this.logAction(ctx, 'admin.organizations.members', { organizationId });
    return data;
  }

  async updateOrganizationMemberRole(
    ctx: AdminRequestContext,
    organizationId: string,
    memberId: string,
    role: string,
  ) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'ORGANIZATION_SERVICE_URL',
      path: `/api/organizations/${organizationId}/members/${memberId}/role`,
      method: 'PATCH',
      ctx,
      data: { role },
    });
    await this.logAction(ctx, 'admin.organizations.role', { organizationId, memberId }, { role });
    return data;
  }

  async getOrganizationBilling(ctx: AdminRequestContext, organizationId: string) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'BILLING_SERVICE_URL',
      path: `/api/v1/organization/${organizationId}/billing`,
      method: 'GET',
      ctx,
    });
    await this.logAction(ctx, 'admin.organizations.billing', { organizationId });
    return data;
  }

  async getOrganizationUsage(ctx: AdminRequestContext, organizationId: string) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'BILLING_SERVICE_URL',
      path: `/api/v1/organization/${organizationId}/usage`,
      method: 'GET',
      ctx,
    });
    await this.logAction(ctx, 'admin.organizations.usage', { organizationId });
    return data;
  }

  async assignOrganizationPlan(
    ctx: AdminRequestContext,
    organizationId: string,
    plan: string,
  ) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'BILLING_SERVICE_URL',
      path: '/api/v1/plan',
      method: 'PATCH',
      ctx,
      data: { organizationId, plan },
    });
    await this.logAction(ctx, 'admin.organizations.plan', { organizationId }, { plan });
    return data;
  }

  private async checkServiceHealth(
    ctx: AdminRequestContext,
    serviceKey: string,
    name: string,
    path = '/health',
  ): Promise<SystemHealthEntry> {
    const baseUrl = this.configService.get<string>(serviceKey);
    const checkedAt = new Date();
    if (!baseUrl) {
      return {
        service: name,
        status: 'unknown',
        checkedAt: checkedAt.toISOString(),
        detail: { message: 'Service URL not configured' },
      };
    }

    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const started = Date.now();
    try {
      const response = await firstValueFrom(
        this.http.get(url, {
          headers: this.buildHeaders(ctx),
          validateStatus: () => true,
        }),
      );
      const latencyMs = Date.now() - started;
      const status = response.status >= 200 && response.status < 300 ? 'up' : 'down';
      return {
        service: name,
        status,
        checkedAt: checkedAt.toISOString(),
        latencyMs,
        detail: response.data,
      };
    } catch (error) {
      const latencyMs = Date.now() - started;
      const message = error instanceof AxiosError ? error.message : (error as Error)?.message ?? String(error);
      this.logger.error(`Health check for ${name} failed`, error as Error);
      return {
        service: name,
        status: 'down',
        checkedAt: checkedAt.toISOString(),
        latencyMs,
        detail: { message },
      };
    }
  }

  async systemHealth(ctx: AdminRequestContext) {
    const services: Array<{ key: string; name: string; path?: string }> = [
      { key: 'USER_SERVICE_URL', name: 'user-service' },
      { key: 'WORKSPACE_SERVICE_URL', name: 'workspace-service' },
      { key: 'API_RUNNER_SERVICE_URL', name: 'runner-service' },
      { key: 'AI_SERVICE_URL', name: 'ai-service' },
      { key: 'BILLING_SERVICE_URL', name: 'billing-service' },
      { key: 'NOTIFICATIONS_SERVICE_URL', name: 'notifications-service' },
      { key: 'LOGS_SERVICE_URL', name: 'logs-service' },
    ];

    const checks = await Promise.all(
      services.map((service) => this.checkServiceHealth(ctx, service.key, service.name, service.path ?? '/health')),
    );

    const redisHealthy = await this.redisService.ping();
    checks.push({
      service: 'redis',
      status: redisHealthy ? 'up' : 'down',
      checkedAt: new Date().toISOString(),
      detail: this.redisService.getStatus(),
    });

    checks.push({
      service: 'gateway',
      status: 'up',
      checkedAt: new Date().toISOString(),
      detail: { version: process.env.npm_package_version ?? 'unknown' },
    });

    await this.logAction(ctx, 'admin.system.health', null, { services: checks.length });
    return checks;
  }

  async listActiveSessions(ctx: AdminRequestContext) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'NOTIFICATIONS_SERVICE_URL',
      path: '/api/admin/sessions/active',
      method: 'GET',
      ctx,
    });
    await this.logAction(ctx, 'admin.sessions.list');
    return data;
  }

  async requestSessionTakeover(
    ctx: AdminRequestContext,
    sessionId: string,
    reason?: string,
  ) {
    const data = await this.proxyRequest<unknown>({
      serviceKey: 'NOTIFICATIONS_SERVICE_URL',
      path: `/api/admin/sessions/${sessionId}/takeover`,
      method: 'POST',
      ctx,
      data: { reason },
    });
    await this.logAction(ctx, 'admin.sessions.takeover', { sessionId }, { reason });
    return data;
  }
}
