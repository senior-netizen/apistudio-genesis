import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Prisma } from '@prisma/client';
import { PresenceTracker, type SyncPresenceEvent } from '@sdl/sync-core';
import type { Logger as PinoLogger } from 'pino';
import type { SyncHandshakeDto } from './dto/handshake.dto';
import type { SyncPullDto } from './dto/pull.dto';
import type { SyncPushDto } from './dto/push.dto';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { ConfigType } from '@nestjs/config';
import appConfig from '../config/configuration';
import { AppLogger } from '../infra/logger/app-logger.service';

interface SyncSession {
  token: string;
  workspaceId: string;
  userId: string;
  deviceId: string;
  expiresAt: number;
}

export interface SyncChangeBroadcast {
  workspaceId: string;
  scopeType: string;
  scopeId: string;
  changes: Array<ReturnType<typeof mapChange>>;
}

export interface SyncConflictBroadcast {
  workspaceId: string;
  scopeType: string;
  scopeId: string;
  deviceId: string | null;
  divergence: number;
}

const SESSION_TTL_MS = 1000 * 60 * 10; // 10 minutes

type SyncChangeRecord = {
  id: string;
  scopeType: string;
  scopeId: string;
  deviceId: string | null;
  opType: SyncOperationLiteral;
  payload: Prisma.JsonValue;
  lamport: bigint | null;
  serverEpoch: bigint | null;
  createdAt: Date;
};

type SyncOperationLiteral = 'INSERT' | 'UPDATE' | 'DELETE' | 'CRDT';
type DeviceKindLiteral = 'WEB' | 'DESKTOP' | 'VSCODE';

function mapChange(change: SyncChangeRecord) {
  return {
    id: change.id,
    scopeType: change.scopeType,
    scopeId: change.scopeId,
    deviceId: change.deviceId,
    opType: change.opType.toLowerCase(),
    payload: change.payload as Record<string, unknown>,
    lamport: Number(change.lamport ?? 0),
    serverEpoch: Number(change.serverEpoch ?? 0),
    createdAt: change.createdAt.toISOString(),
  };
}

@Injectable()
export class SyncService {
  private readonly logger: PinoLogger;
  // TODO(scales): migrate sessions into Redis with TTLs so API nodes remain stateless across deployments.
  private readonly sessions = new Map<string, SyncSession>();
  // TODO(scales): move presence tracking to Redis pub/sub so online state is shared across pods.
  private readonly presence = new Map<string, PresenceTracker>();
  private readonly events = new EventEmitter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
    appLogger: AppLogger,
  ) {
    this.logger = appLogger.forContext(SyncService.name);
  }

  onChanges(listener: (payload: SyncChangeBroadcast) => void) {
    this.events.on('changes', listener);
  }

  offChanges(listener: (payload: SyncChangeBroadcast) => void) {
    this.events.off('changes', listener);
  }

  onConflict(listener: (payload: SyncConflictBroadcast) => void) {
    this.events.on('conflict', listener);
  }

  offConflict(listener: (payload: SyncConflictBroadcast) => void) {
    this.events.off('conflict', listener);
  }

  onPresence(listener: (workspaceId: string, states: ReturnType<PresenceTracker['list']>) => void) {
    this.events.on('presence', listener);
  }

  recordPresence(workspaceId: string, event: SyncPresenceEvent) {
    const tracker = this.getPresenceTracker(workspaceId);
    tracker.observe(event);
    const state = tracker.list();
    this.events.emit('presence', workspaceId, state);
  }

  listPresence(workspaceId: string) {
    return this.getPresenceTracker(workspaceId).list();
  }

  private getPresenceTracker(workspaceId: string) {
    if (!this.presence.has(workspaceId)) {
      this.presence.set(workspaceId, new PresenceTracker());
    }
    return this.presence.get(workspaceId)!;
  }

  private sessionKey(token: string) {
    return `sync:session:${token}`;
  }

  private async persistSession(session: SyncSession) {
    this.sessions.set(session.token, session);
    try {
      const client = await this.redis.getClient();
      await client.set(this.sessionKey(session.token), JSON.stringify(session), 'PX', SESSION_TTL_MS);
    } catch (error) {
      this.logger.debug({ error }, 'sync session not persisted to redis');
    }
  }

  private async loadSession(token: string): Promise<SyncSession | null> {
    const existing = this.sessions.get(token);
    if (existing) return existing;
    try {
      const client = await this.redis.getClient();
      const raw = await client.get(this.sessionKey(token));
      if (raw) {
        const parsed = JSON.parse(raw) as SyncSession;
        this.sessions.set(token, parsed);
        return parsed;
      }
    } catch (error) {
      this.logger.debug({ error }, 'sync session not loaded from redis');
    }
    return null;
  }

  private async deleteSession(token: string) {
    this.sessions.delete(token);
    try {
      const client = await this.redis.getClient();
      await client.del(this.sessionKey(token));
    } catch (error) {
      this.logger.debug({ error }, 'sync session not removed from redis');
    }
  }

  async verifySession(token: string): Promise<SyncSession | null> {
    const session = await this.loadSession(token);
    if (!session) {
      return null;
    }
    if (session.expiresAt < Date.now()) {
      await this.deleteSession(token);
      return null;
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    await this.persistSession(session);
    return session;
  }

  async handshake(user: { id: string }, dto: SyncHandshakeDto) {
    await this.ensureWorkspaceMembership(user.id, dto.workspaceId);
    const deviceId = await this.ensureDevice(user.id, dto);
    const { _max } = await this.prisma.syncChange.aggregate({
      _max: { serverEpoch: true },
    });
    const sessionToken = randomUUID();
    await this.persistSession({
      token: sessionToken,
      workspaceId: dto.workspaceId,
      userId: user.id,
      deviceId,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return {
      serverTime: new Date().toISOString(),
      protocolVersion: dto.protocolVersion,
      deviceId,
      sessionToken,
      lastEpoch: Number(_max.serverEpoch ?? 0),
    };
  }

  async pull(user: { id: string }, dto: SyncPullDto) {
    const workspaceId = await this.assertScopeAccess(user.id, dto.scopeType, dto.scopeId);
    this.logger.debug(`pull scope=${dto.scopeType}:${dto.scopeId} user=${user.id}`);
    // TODO(scales): ensure composite index on (scope_type, scope_id, server_epoch) to keep this query O(log n).
    const changes = await this.prisma.syncChange.findMany({
      where: {
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        ...(dto.sinceEpoch != null ? { serverEpoch: { gt: BigInt(dto.sinceEpoch) } } : {}),
      },
      orderBy: { serverEpoch: 'asc' },
      take: 500,
    });

    const snapshot = await this.prisma.syncSnapshot.findFirst({
      where: { scopeType: dto.scopeType, scopeId: dto.scopeId },
      orderBy: { version: 'desc' },
    });

    return {
      workspaceId,
      changes: changes.map((change: SyncChangeRecord) => mapChange(change)),
      snapshot: snapshot
        ? {
            id: snapshot.id,
            scopeType: snapshot.scopeType,
            scopeId: snapshot.scopeId,
            version: Number(snapshot.version ?? 0),
            payloadCompressed: snapshot.payloadCompressed.toString('base64'),
            createdAt: snapshot.createdAt.toISOString(),
          }
        : null,
    };
  }

  async push(user: { id: string }, dto: SyncPushDto) {
    if (dto.changes.length === 0) {
      return { ack: { minEpoch: 0, maxEpoch: 0 }, conflicts: [] };
    }
    const scope = dto.changes[0];
    const workspaceId = await this.assertScopeAccess(user.id, scope.scopeType, scope.scopeId);
    const incomingClock = dto.vectorClock ?? {};
    const divergenceCheck =
      Object.keys(incomingClock).length === 0
        ? { divergence: 0 }
        : await this.detectDivergence(scope.scopeType, scope.scopeId, scope.deviceId ?? null, incomingClock);
    if (divergenceCheck.divergence > this.config.sync.divergenceThreshold) {
      this.emitConflict({
        workspaceId,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        deviceId: scope.deviceId ?? null,
        divergence: divergenceCheck.divergence,
      });
      return {
        ack: { minEpoch: 0, maxEpoch: 0 },
        conflicts: [
          {
            reason: 'VECTOR_CLOCK_DIVERGENCE',
            divergence: divergenceCheck.divergence,
          },
        ],
      };
    }

    // TODO(scales): consider table partitioning on scope_id to cap hot partitions and archive old epochs.
    const result = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.syncChange.findFirst({ orderBy: { serverEpoch: 'desc' }, select: { serverEpoch: true } });
      let nextEpoch = Number(latest?.serverEpoch ?? 0);
      const created: Array<ReturnType<typeof mapChange>> = [];

      for (const change of dto.changes) {
        nextEpoch += 1;
        const saved = await tx.syncChange.create({
          data: {
            id: change.id,
            scopeType: change.scopeType,
            scopeId: change.scopeId,
            deviceId: change.deviceId,
            opType: this.mapOperation(change.opType),
            payload: change.payload as Prisma.InputJsonValue,
            lamport: BigInt(change.lamport ?? 0),
            serverEpoch: BigInt(nextEpoch),
          },
        });
        await tx.syncState.upsert({
          where: {
            scope_type_scope_id_device_id: {
              scope_type: change.scopeType,
              scope_id: change.scopeId,
              device_id: change.deviceId,
            },
          },
          create: {
            scopeType: change.scopeType,
            scopeId: change.scopeId,
            deviceId: change.deviceId,
            vectorClock: dto.vectorClock ?? {},
            serverEpoch: BigInt(nextEpoch),
          },
          update: {
            vectorClock: dto.vectorClock ?? Prisma.JsonNull,
            serverEpoch: BigInt(nextEpoch),
          },
        });
        created.push(mapChange(saved as SyncChangeRecord));
      }

      return { minEpoch: nextEpoch - created.length + 1, maxEpoch: nextEpoch, created };
    });

    this.events.emit('changes', {
      workspaceId,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      changes: result.created,
    });
    await this.persistVectorClock(scope.scopeType, scope.scopeId, scope.deviceId ?? null, incomingClock, workspaceId);

    return {
      ack: { minEpoch: result.minEpoch, maxEpoch: result.maxEpoch },
      conflicts: [],
    };
  }

  private async ensureWorkspaceMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
    });
    if (!membership) {
      throw new ForbiddenException('User does not belong to workspace');
    }
  }

  private async persistVectorClock(
    scopeType: string,
    scopeId: string,
    deviceId: string | null,
    vectorClock: Record<string, number>,
    workspaceId: string,
  ) {
    try {
      const client = await this.redis.getClient();
      await client.set(
        this.vectorClockKey(scopeType, scopeId, deviceId),
        JSON.stringify({ vectorClock, workspaceId }),
        'EX',
        Math.max(60, this.config.sync.vectorClockTtlSec),
      );
    } catch (error) {
      this.logger.debug(`Vector clock persistence skipped: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async detectDivergence(
    scopeType: string,
    scopeId: string,
    deviceId: string | null,
    vectorClock: Record<string, number>,
  ) {
    try {
      const client = await this.redis.getClient();
      const existing = await client.get(this.vectorClockKey(scopeType, scopeId, deviceId));
      if (!existing) {
        return { divergence: 0 };
      }
      const parsed = JSON.parse(existing) as { vectorClock?: Record<string, number> };
      return { divergence: this.computeDivergence(parsed.vectorClock ?? {}, vectorClock) };
    } catch (error) {
      this.logger.debug(`Vector clock divergence check skipped: ${error instanceof Error ? error.message : error}`);
      return { divergence: 0 };
    }
  }

  private vectorClockKey(scopeType: string, scopeId: string, deviceId: string | null) {
    return `sync:vc:${scopeType}:${scopeId}:${deviceId ?? 'unknown'}`;
  }

  private computeDivergence(previous: Record<string, number>, next: Record<string, number>) {
    const actors = new Set([...Object.keys(previous), ...Object.keys(next)]);
    let diff = 0;
    for (const actor of actors) {
      diff += Math.abs((previous[actor] ?? 0) - (next[actor] ?? 0));
    }
    return diff;
  }

  private emitConflict(payload: SyncConflictBroadcast) {
    this.events.emit('conflict', payload);
  }

  private async ensureDevice(userId: string, dto: SyncHandshakeDto) {
    if (dto.deviceId) {
      const existing = await this.prisma.device.findFirst({ where: { id: dto.deviceId, userId } });
      if (existing) {
        return existing.id;
      }
    }
    const fingerprint = dto.deviceFingerprint ?? randomUUID();
    const created = await this.prisma.device.create({
      data: {
        userId,
        kind: this.mapDeviceKind(dto.appKind),
        fingerprint,
      },
    });
    return created.id;
  }

  private mapDeviceKind(kind: SyncHandshakeDto['appKind']): DeviceKindLiteral {
    switch (kind) {
      case 'desktop':
        return 'DESKTOP';
      case 'vscode':
        return 'VSCODE';
      case 'web':
      default:
        return 'WEB';
    }
  }

  private mapOperation(op: string): SyncOperationLiteral {
    switch (op) {
      case 'insert':
        return 'INSERT';
      case 'update':
        return 'UPDATE';
      case 'delete':
        return 'DELETE';
      case 'crdt':
      default:
        return 'CRDT';
    }
  }

  private async assertScopeAccess(userId: string, scopeType: string, scopeId: string) {
    switch (scopeType) {
      case 'workspace':
        await this.ensureWorkspaceMembership(userId, scopeId);
        return scopeId;
      case 'project': {
        const project = await this.prisma.project.findUnique({ where: { id: scopeId } });
        if (!project) {
          throw new ForbiddenException('Project not found');
        }
        await this.ensureWorkspaceMembership(userId, project.workspaceId);
        return project.workspaceId;
      }
      case 'collection': {
        const collection = await this.prisma.collection.findUnique({ where: { id: scopeId } });
        if (!collection) {
          throw new ForbiddenException('Collection not found');
        }
        await this.ensureWorkspaceMembership(userId, collection.workspaceId);
        return collection.workspaceId;
      }
      case 'environment': {
        const environment = await this.prisma.environment.findUnique({ where: { id: scopeId } });
        if (!environment) {
          throw new ForbiddenException('Environment not found');
        }
        await this.ensureWorkspaceMembership(userId, environment.workspaceId);
        return environment.workspaceId;
      }
      case 'variable': {
        const variable = await this.prisma.variable.findUnique({ where: { id: scopeId } });
        if (!variable) {
          throw new ForbiddenException('Variable not found');
        }
        if (variable.workspaceId) {
          await this.ensureWorkspaceMembership(userId, variable.workspaceId);
          return variable.workspaceId;
        }
        if (variable.environmentId) {
          const environment = await this.prisma.environment.findUnique({ where: { id: variable.environmentId } });
          if (!environment) {
            throw new ForbiddenException('Environment not found');
          }
          await this.ensureWorkspaceMembership(userId, environment.workspaceId);
          return environment.workspaceId;
        }
        throw new ForbiddenException('Variable scope not resolved');
      }
      case 'request':
      case 'secret':
      default:
        return this.resolveGenericScope(userId, scopeType, scopeId);
    }
  }

  private async resolveGenericScope(userId: string, scopeType: string, scopeId: string) {
    if (scopeType === 'request') {
      const request = await this.prisma.request.findUnique({
        where: { id: scopeId },
        include: { collection: true },
      });
      if (!request?.collection) {
        throw new ForbiddenException('Request not found');
      }
      await this.ensureWorkspaceMembership(userId, request.collection.workspaceId);
      return request.collection.workspaceId;
    }
    if (scopeType === 'secret') {
      const secret = await this.prisma.secret.findUnique({ where: { id: scopeId } });
      if (!secret) {
        throw new ForbiddenException('Secret not found');
      }
      if (secret.scopeType === 'WORKSPACE') {
        await this.ensureWorkspaceMembership(userId, secret.scopeId);
        return secret.scopeId;
      }
      const project = await this.prisma.project.findUnique({ where: { id: secret.scopeId } });
      if (!project) {
        throw new ForbiddenException('Secret scope not found');
      }
      await this.ensureWorkspaceMembership(userId, project.workspaceId);
      return project.workspaceId;
    }
    throw new ForbiddenException('Unsupported sync scope');
  }
}
