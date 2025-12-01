import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import type { PairSessionState } from '../types';

@Injectable()
export class PairService {
  private readonly logger = new Logger(PairService.name);

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  private key(workspaceId: string, requestId?: string | null) {
    const suffix = requestId ?? 'workspace';
    return `pair:workspace:${workspaceId}:request:${suffix}`;
  }

  async startSession(params: {
    workspaceId: string;
    requestId?: string | null;
    driverId: string;
    navigatorId: string;
  }): Promise<PairSessionState> {
    const startedAt = new Date();
    const session = await this.prisma.pairSession.create({
      data: {
        workspaceId: params.workspaceId,
        requestId: params.requestId ?? undefined,
        driverId: params.driverId,
        navigatorId: params.navigatorId,
        startedAt,
      },
    });
    const state: PairSessionState = {
      sessionId: session.id,
      workspaceId: params.workspaceId,
      requestId: params.requestId ?? null,
      driverId: params.driverId,
      navigatorId: params.navigatorId,
      startedAt: session.startedAt.toISOString(),
      endedAt: null,
    };
    try {
      const client = await this.redis.getClient();
      await client.set(this.key(params.workspaceId, params.requestId), JSON.stringify(state), 'EX', 60 * 60);
    } catch (error) {
      this.logger.warn(`Failed to cache pair session: ${error instanceof Error ? error.message : error}`);
    }
    return state;
  }

  async getActiveSession(workspaceId: string, requestId?: string | null): Promise<PairSessionState | null> {
    try {
      const client = await this.redis.getClient();
      const raw = await client.get(this.key(workspaceId, requestId));
      if (raw) {
        return JSON.parse(raw) as PairSessionState;
      }
    } catch (error) {
      this.logger.warn(`Failed to read pair session cache: ${error instanceof Error ? error.message : error}`);
    }
    const record = await this.prisma.pairSession.findFirst({
      where: {
        workspaceId,
        requestId: requestId ?? undefined,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
    if (!record) {
      return null;
    }
    return {
      sessionId: record.id,
      workspaceId,
      requestId: record.requestId ?? null,
      driverId: record.driverId,
      navigatorId: record.navigatorId,
      startedAt: record.startedAt.toISOString(),
      endedAt: record.endedAt?.toISOString() ?? null,
    };
  }

  async endSession(workspaceId: string, requestId?: string | null): Promise<PairSessionState | null> {
    const key = this.key(workspaceId, requestId);
    let state: PairSessionState | null = null;
    try {
      const client = await this.redis.getClient();
      const raw = await client.get(key);
      if (raw) {
        state = JSON.parse(raw) as PairSessionState;
        await client.del(key);
      }
    } catch (error) {
      this.logger.warn(`Failed to consume pair session cache: ${error instanceof Error ? error.message : error}`);
    }
    const endedAt = new Date();
    if (state) {
      await this.prisma.pairSession.update({
        where: { id: state.sessionId },
        data: { endedAt },
      });
      return { ...state, endedAt: endedAt.toISOString() };
    }
    const record = await this.prisma.pairSession.findFirst({
      where: { workspaceId, requestId: requestId ?? undefined, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!record) {
      return null;
    }
    const updated = await this.prisma.pairSession.update({
      where: { id: record.id },
      data: { endedAt },
    });
    return {
      sessionId: updated.id,
      workspaceId,
      requestId: updated.requestId ?? null,
      driverId: updated.driverId,
      navigatorId: updated.navigatorId,
      startedAt: updated.startedAt.toISOString(),
      endedAt: updated.endedAt?.toISOString() ?? endedAt.toISOString(),
    };
  }
}
