import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

type PerformanceSnapshot = {
  latencyMs: number;
  p95LatencyMs: number;
  throughputPerMinute: number;
  errorRate: number;
  recommendations: string[];
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService, private readonly queues: QueueService) {}

  async recordRun(workspaceId: string, requestId: string, durationMs: number, status: string) {
    await this.prisma.analyticsEvent.create({
      data: { workspaceId, requestId, type: `request.${status.toLowerCase()}`, durationMs },
    });
    await this.queues.getQueue(QUEUES.ANALYTICS_ROLLUP).add('rollup', { workspaceId });
  }

  async summary(workspaceId: string) {
    const [totalRuns, avgDuration] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { workspaceId } }),
      this.prisma.analyticsEvent.aggregate({
        where: { workspaceId },
        _avg: { durationMs: true },
      }),
    ]);
    return { totalRuns, averageDurationMs: avgDuration._avg.durationMs ?? 0 };
  }

  async performance(workspaceId: string, windowMinutes = 60): Promise<PerformanceSnapshot> {
    const normalizedWindow = this.normalizeWindow(windowMinutes);
    const cutoff = new Date(Date.now() - normalizedWindow * 60_000);
    const where = { workspaceId, createdAt: { gte: cutoff } };

    const [runs, avgDuration, p95Row, errorCount] = await Promise.all([
      this.prisma.analyticsEvent.count({ where }),
      this.prisma.analyticsEvent.aggregate({ where, _avg: { durationMs: true } }),
      this.prisma.$queryRaw<Array<{ p95: number | null }>>`
        SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY "duration_ms") AS p95
        FROM "analytics_events"
        WHERE "workspace_id" = ${workspaceId}
          AND "created_at" >= ${cutoff}
          AND "duration_ms" IS NOT NULL
      `,
      this.prisma.analyticsEvent.count({ where: { ...where, type: { startsWith: 'request.error' } } }),
    ]);

    const throughputPerMinute = normalizedWindow > 0 ? runs / normalizedWindow : 0;
    const errorRate = runs > 0 ? errorCount / runs : 0;

    const recommendations: string[] = [];
    const avgMs = avgDuration._avg.durationMs ?? 0;
    if (avgMs > 750) {
      recommendations.push('Average latency is elevated; investigate upstream dependency latency and query plans.');
    }
    if (errorRate >= 0.05) {
      recommendations.push('Error rate is above 5%; review recent failing routes and deploy rollback criteria.');
    }
    if (throughputPerMinute < 1) {
      recommendations.push('Low recent traffic detected; validate synthetic checks to keep baseline telemetry healthy.');
    }

    return {
      latencyMs: avgMs,
      p95LatencyMs: p95Row[0]?.p95 ?? 0,
      throughputPerMinute,
      errorRate,
      recommendations,
    };
  }

  async errors(workspaceId: string, windowMinutes = 60) {
    const normalizedWindow = this.normalizeWindow(windowMinutes);
    const cutoff = new Date(Date.now() - normalizedWindow * 60_000);

    const buckets = await this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
      SELECT date_trunc('minute', "created_at") AS bucket, COUNT(*)::bigint AS count
      FROM "analytics_events"
      WHERE "workspace_id" = ${workspaceId}
        AND "created_at" >= ${cutoff}
        AND "type" LIKE 'request.error%'
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return buckets.map((row) => ({
      timestamp: row.bucket.toISOString(),
      count: Number(row.count),
    }));
  }

  private normalizeWindow(windowMinutes: number): number {
    if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
      throw new BadRequestException('windowMinutes must be a positive number.');
    }
    return Math.min(Math.floor(windowMinutes), 24 * 60);
  }
}
