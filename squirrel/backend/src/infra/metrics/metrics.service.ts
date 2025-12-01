import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  readonly httpDuration: Histogram<string>;
  readonly httpCount: Counter<string>;
  readonly queueDepth: Gauge<string>;
  readonly redisHitRatio: Gauge<string>;
  readonly healthCounter: Counter<string>;
  readonly readinessDependencyFailures: Counter<string>;
  readonly variablesOperationCount: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
    this.httpCount = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
    this.queueDepth = new Gauge({
      name: 'queue_depth',
      help: 'BullMQ queue depth',
      labelNames: ['queue'],
      registers: [this.registry],
    });
    this.redisHitRatio = new Gauge({
      name: 'redis_hit_ratio',
      help: 'Redis hit ratio',
      registers: [this.registry],
    });
    this.healthCounter = new Counter({
      name: 'healthcheck_requests_total',
      help: 'Total health and readiness checks',
      labelNames: ['endpoint', 'status'],
      registers: [this.registry],
    });
    this.readinessDependencyFailures = new Counter({
      name: 'readiness_dependency_failures_total',
      help: 'Count of readiness check failures grouped by dependency',
      labelNames: ['dependency'],
      registers: [this.registry],
    });
    this.variablesOperationCount = new Counter({
      name: 'variables_operations_total',
      help: 'Variables module operation counts',
      labelNames: ['operation', 'status'],
      registers: [this.registry],
    });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordHealthCheck(endpoint: 'healthz' | 'readyz', success: boolean) {
    this.healthCounter.inc({ endpoint, status: success ? 'success' : 'failure' });
  }

  recordReadinessFailure(dependency: string) {
    this.readinessDependencyFailures.inc({ dependency });
  }

  recordVariableOperation(operation: string, status: 'success' | 'failure') {
    this.variablesOperationCount.inc({ operation, status });
  }
}
