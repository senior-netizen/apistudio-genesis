import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { MetricsService } from '../../infra/metrics/metrics.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

interface ReadinessCheck {
  dependency: string;
  status: 'up' | 'down';
  error?: string;
}

@Controller({ version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  @Get('health')
  heartbeat() {
    const payload = { status: 'ok' as const };
    this.metrics.recordHealthCheck('healthz', true);
    return payload;
  }

  @Get('readyz')
  async getReadyz() {
    const checks: ReadinessCheck[] = [];

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({ dependency: 'database', status: 'up' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ dependency: 'database', status: 'down', error: message });
      this.metrics.recordReadinessFailure('database');
    }

    try {
      const client = await this.redis.getClient();
      const response = await client.ping();
      if (response !== 'PONG') {
        throw new Error(`Unexpected ping response: ${response}`);
      }
      checks.push({ dependency: 'redis', status: 'up' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ dependency: 'redis', status: 'down', error: message });
      this.metrics.recordReadinessFailure('redis');
    }

    const isReady = checks.every((check) => check.status === 'up');
    this.metrics.recordHealthCheck('readyz', isReady);

    const payload = {
      status: isReady ? 'ok' : 'error',
      checks,
    } as const;

    if (!isReady) {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  @Get('ready')
  async getReadyLegacy() {
    return this.getReadyz();
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async metricsEndpoint() {
    return this.metrics.getMetrics();
  }

  @Get('api/metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async metricsWithPrefix() {
    return this.metrics.getMetrics();
  }
}
