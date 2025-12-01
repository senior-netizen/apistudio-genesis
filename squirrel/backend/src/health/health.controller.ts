import { Controller, Get } from '@nestjs/common';
import { MetricsService } from '../infra/metrics/metrics.service';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

@Controller({ version: '1' })
export class HealthController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('health')
  heartbeatLegacy(): HealthResponse {
    return this.buildResponse();
  }

  @Get('healthz')
  heartbeat(): HealthResponse {
    const payload = this.buildResponse();
    this.metrics.recordHealthCheck('healthz', true);
    return payload;
  }

  private buildResponse(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
