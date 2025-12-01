import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';
import { WorkspaceRole } from '../../../infra/prisma/enums';
import type { PresenceState } from '../types';

@Injectable()
export class CollabPresenceService {
  private readonly logger = new Logger(CollabPresenceService.name);

  constructor(private readonly redis: RedisService) {}

  private key(workspaceId: string, docId: string) {
    return `presence:workspace:${workspaceId}:doc:${docId}`;
  }

  async join(workspaceId: string, docId: string, socketId: string, state: PresenceState): Promise<PresenceState> {
    return this.upsert(workspaceId, docId, socketId, state);
  }

  async upsert(
    workspaceId: string,
    docId: string,
    socketId: string,
    patch: Partial<PresenceState>,
  ): Promise<PresenceState> {
    const client = await this.redis.getClient();
    const key = this.key(workspaceId, docId);
    const existingRaw = await client.hget(key, socketId);
    const now = new Date().toISOString();
    const existing: PresenceState | undefined = existingRaw ? (JSON.parse(existingRaw) as PresenceState) : undefined;
    const base: PresenceState =
      existing ??
      ({
        socketId,
        userId: patch.userId ?? '',
        displayName: patch.displayName ?? 'Unknown',
        email: patch.email,
        role: patch.role ?? WorkspaceRole.VIEWER,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      } as PresenceState);
    const next: PresenceState = {
      ...base,
      ...patch,
      cursor: patch.cursor ?? base.cursor,
      typing: patch.typing ?? base.typing,
      status: (patch.status as PresenceState['status']) ?? base.status,
      updatedAt: now,
    };
    await client.hset(key, socketId, JSON.stringify(next));
    await client.expire(key, 120);
    return next;
  }

  async leave(workspaceId: string, docId: string, socketId: string): Promise<PresenceState | null> {
    const client = await this.redis.getClient();
    const key = this.key(workspaceId, docId);
    const existingRaw = await client.hget(key, socketId);
    await client.hdel(key, socketId);
    if (!existingRaw) {
      return null;
    }
    return JSON.parse(existingRaw) as PresenceState;
  }

  async list(workspaceId: string, docId: string): Promise<PresenceState[]> {
    const client = await this.redis.getClient();
    const key = this.key(workspaceId, docId);
    const entries = await client.hgetall(key);
    return Object.values(entries ?? {}).map((value) => {
      try {
        return JSON.parse(value) as PresenceState;
      } catch (error) {
        this.logger.warn(`Failed to parse presence state for ${key}: ${error instanceof Error ? error.message : error}`);
        return null;
      }
    }).filter((value): value is PresenceState => value !== null);
  }
}
