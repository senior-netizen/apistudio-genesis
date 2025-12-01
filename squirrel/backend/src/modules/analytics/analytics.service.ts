import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

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
}
