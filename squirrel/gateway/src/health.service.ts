import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { RedisService } from './config/redis.service';

type HealthStatus = 'up' | 'down' | 'unknown';

interface ServiceDefinition {
  name: string;
  envKey: string;
  healthPath?: string;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly services: ServiceDefinition[] = [
    { name: 'auth-service', envKey: 'AUTH_SERVICE_URL', healthPath: '/api/auth/health' },
    { name: 'user-service', envKey: 'USER_SERVICE_URL', healthPath: '/api/users/health' },
    { name: 'workspace-service', envKey: 'WORKSPACE_SERVICE_URL', healthPath: '/api/workspaces/health' },
    { name: 'api-runner-service', envKey: 'API_RUNNER_SERVICE_URL', healthPath: '/api/runner/health' },
    { name: 'ai-service', envKey: 'AI_SERVICE_URL', healthPath: '/api/ai/health' },
    { name: 'billing-service', envKey: 'BILLING_SERVICE_URL', healthPath: '/api/billing/health' },
    { name: 'notifications-service', envKey: 'NOTIFICATIONS_SERVICE_URL', healthPath: '/api/notifications/health' },
    { name: 'logs-service', envKey: 'LOGS_SERVICE_URL', healthPath: '/api/logs/health' },
  ];

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async check() {
    const serviceResults = await Promise.all(this.services.map((service) => this.checkService(service)));

    if (this.redisService) {
      const redisStatus = await this.checkRedis();
      serviceResults.push(redisStatus);
    }

    const degraded = serviceResults.some((service) => service.status === 'down');

    return {
      status: degraded ? 'degraded' : 'ok',
      service: 'gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: serviceResults,
    };
  }

  private async checkService(service: ServiceDefinition): Promise<ServiceHealth> {
    const baseUrl = this.configService.get<string>(service.envKey);
    if (!baseUrl) {
      return { name: service.name, status: 'unknown', message: 'Service URL not configured' };
    }

    const healthUrl = this.resolveUrl(baseUrl, service.healthPath ?? '/health');
    const startedAt = Date.now();

    try {
      const headers: Record<string, string> = {
        'x-request-id': uuid(),
      };
      const internalKey = this.configService.get<string>('SQUIRREL_INTERNAL_KEY');
      if (internalKey) {
        headers['x-internal-key'] = internalKey;
      }

      const response = await firstValueFrom(
        this.http.get(healthUrl, {
          timeout: Number(this.configService.get('HEALTH_CHECK_TIMEOUT') ?? 2000),
          headers,
          validateStatus: () => true,
        }),
      );

      const latencyMs = Date.now() - startedAt;
      const status: HealthStatus = response.status >= 200 && response.status < 300 ? 'up' : 'down';
      return {
        name: service.name,
        status,
        latencyMs,
        message: status === 'up' ? undefined : `Unexpected status ${response.status}`,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Health check failed for ${service.name}: ${message}`);
      return { name: service.name, status: 'down', latencyMs, message };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    try {
      const healthy = await this.redisService.ping();
      return {
        name: 'redis',
        status: healthy ? 'up' : 'down',
        message: healthy ? undefined : 'Redis ping failed',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis health check failed: ${message}`);
      return { name: 'redis', status: 'down', message };
    }
  }

  private resolveUrl(base: string, path: string) {
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return new URL(path.startsWith('/') ? path.slice(1) : path, normalizedBase).toString();
  }
}
