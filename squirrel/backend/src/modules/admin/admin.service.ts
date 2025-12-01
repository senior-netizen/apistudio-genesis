import { Injectable, Logger } from '@nestjs/common';
import type { MetricValue } from 'prom-client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MetricsService } from '../../infra/metrics/metrics.service';
import { RedisService } from '../../infra/redis/redis.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { resolveAccountRole } from '../../common/security/owner-role.util';

type AdminUserRecord = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  accountFrozen: boolean;
  sessions: Array<{ updatedAt: Date; createdAt: Date }>;
  updatedAt: Date;
};

type AuditLogRecord = {
  id: string;
  action: string;
  actorId: string;
  targetId: string | null;
  metadata: unknown;
  workspaceId: string;
  createdAt: Date;
};

type RequestRunRecord = {
  id: string;
  requestId: string;
  userId: string;
  status: string;
  responseCode: number | null;
  durationMs: number | null;
  createdAt: Date;
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeGateway,
  ) {}

  listFeatureFlags() {
    return this.prisma.featureFlag.findMany();
  }

  async updateFeatureFlag(key: string, enabled: boolean, payload?: any) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, payload } as any,
      create: { key, enabled, payload } as any,
    });
  }

  async listRateLimits() {
    return [{ plan: 'FREE', window: 60, maxRequests: 600 }];
  }

  async overview() {
    const uptimeSeconds = Math.floor(process.uptime());
    const version =
      process.env.APP_VERSION ?? process.env.npm_package_version ?? process.env.VERSION ?? '0.0.0';

    let errorRate = 0;
    try {
      const metric = await this.metrics.httpCount.get();
      const values = metric?.values ?? ([] as MetricValue<string>[]);
      const totals = values.reduce(
        (acc, entry) => {
          const status = Number.parseInt(String(entry.labels?.status ?? '0'), 10);
          const value = Number(entry.value ?? 0);
          return {
            total: acc.total + value,
            errors: acc.errors + (status >= 400 ? value : 0),
          };
        },
        { total: 0, errors: 0 },
      );
      errorRate = totals.total > 0 ? totals.errors / totals.total : 0;
    } catch (error) {
      this.logger.warn(`Failed to calculate error rate: ${error instanceof Error ? error.message : error}`);
    }

    return {
      uptimeSeconds,
      version,
      errorRate,
    } as const;
  }

  async listUsers() {
    const users = (await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        accountFrozen: true,
        sessions: {
          select: { updatedAt: true, createdAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        updatedAt: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    })) as unknown as AdminUserRecord[];

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: resolveAccountRole(user.email, user.role),
      accountFrozen: user.accountFrozen,
      lastSeenAt: user.sessions[0]?.updatedAt ?? user.sessions[0]?.createdAt ?? user.updatedAt,
    }));
  }

  async setAccountRole(userId: string, role: 'admin' | 'user') {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
    if (!user) {
      throw new Error('User not found');
    }
    if (resolveAccountRole(user.email, user.role) === 'founder') {
      throw new Error('Cannot modify founder role');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { role } });
  }

  async setAccountFrozen(userId: string, frozen: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountFrozen: frozen } as any,
    });
  }

  async recentActivity(limit = 25) {
      const [auditLogs, requestRuns] = await Promise.all([
        this.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            action: true,
            actorId: true,
            targetId: true,
            metadata: true,
            workspaceId: true,
            createdAt: true,
          } as any,
        }),
        this.prisma.requestRun.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            requestId: true,
            userId: true,
            status: true,
            responseCode: true,
            durationMs: true,
            createdAt: true,
          } as any,
        }),
      ]);

      const logs = auditLogs as unknown as AuditLogRecord[];
      const runs = requestRuns as unknown as RequestRunRecord[];

      const combined = [
        ...logs.map((entry) => ({
          id: entry.id,
          type: 'audit' as const,
          createdAt: entry.createdAt,
          actorId: entry.actorId,
          workspaceId: entry.workspaceId,
          detail: { action: entry.action, targetId: entry.targetId, metadata: entry.metadata },
        })),
        ...runs.map((run: RequestRunRecord) => ({
          id: run.id,
          type: 'request' as const,
          createdAt: run.createdAt,
        actorId: run.userId,
        workspaceId: undefined,
        detail: {
          status: run.status,
          responseCode: run.responseCode,
          durationMs: run.durationMs,
          requestId: run.requestId,
        },
      })),
    ];

    return combined
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async systemHealth() {
    const results: Array<{ component: string; status: 'up' | 'down'; detail?: string }> = [];

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      results.push({ component: 'database', status: 'up' });
    } catch (error) {
      results.push({
        component: 'database',
        status: 'down',
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const client = await this.redis.getClient();
      const reply = await client.ping();
      results.push({ component: 'redis', status: reply === 'PONG' ? 'up' : 'down' });
    } catch (error) {
      results.push({
        component: 'redis',
        status: 'down',
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const engine = this.realtime?.server?.engine as { clientsCount?: number } | undefined;
      if (engine && typeof engine.clientsCount === 'number') {
        results.push({ component: 'websocket', status: 'up', detail: `${engine.clientsCount} clients connected` });
      } else if (this.realtime?.server) {
        results.push({ component: 'websocket', status: 'up' });
      } else {
        results.push({ component: 'websocket', status: 'down', detail: 'Gateway not initialized' });
      }
    } catch (error) {
      results.push({
        component: 'websocket',
        status: 'down',
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }
}
