import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';

export interface WorkspacePresenceCursor {
  field: string;
  position: number;
  valueLength: number;
  selection?: { start: number; end: number } | null;
}

export interface WorkspacePresenceState {
  socketId: string;
  userId: string;
  displayName: string;
  email?: string;
  joinedAt: string;
  updatedAt: string;
  cursor?: WorkspacePresenceCursor | null;
}

@Injectable()
export class WorkspaceAwarenessService {
  private readonly logger = new Logger(WorkspaceAwarenessService.name);

  constructor(private readonly redis: RedisService) {}

  private key(workspaceId: string) {
    return `collab:workspace:${workspaceId}:awareness`;
  }

  async join(workspaceId: string, socketId: string, state: WorkspacePresenceState) {
    return this.upsert(workspaceId, socketId, state);
  }

  async upsert(
    workspaceId: string,
    socketId: string,
    patch: Partial<WorkspacePresenceState>,
  ): Promise<WorkspacePresenceState> {
    const client = await this.redis.getClient();
    const key = this.key(workspaceId);
    const raw = await client.hget(key, socketId);
    const now = new Date().toISOString();
    const base: WorkspacePresenceState = raw
      ? (JSON.parse(raw) as WorkspacePresenceState)
      : {
          socketId,
          userId: patch.userId ?? '',
          displayName: patch.displayName ?? 'Unknown',
          email: patch.email,
          joinedAt: now,
          updatedAt: now,
          cursor: patch.cursor ?? null,
        };
    const next: WorkspacePresenceState = {
      ...base,
      ...patch,
      cursor: patch.cursor ?? base.cursor ?? null,
      updatedAt: now,
    };
    await client.hset(key, socketId, JSON.stringify(next));
    await client.expire(key, 120);
    return next;
  }

  async leave(workspaceId: string, socketId: string): Promise<WorkspacePresenceState | null> {
    const client = await this.redis.getClient();
    const key = this.key(workspaceId);
    const raw = await client.hget(key, socketId);
    await client.hdel(key, socketId);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as WorkspacePresenceState;
    } catch (error) {
      this.logger.warn(`Failed to parse workspace presence for ${socketId}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async list(workspaceId: string): Promise<WorkspacePresenceState[]> {
    const client = await this.redis.getClient();
    const key = this.key(workspaceId);
    const entries = await client.hgetall(key);
    return Object.values(entries ?? {})
      .map((value) => {
        try {
          return JSON.parse(value) as WorkspacePresenceState;
        } catch (error) {
          this.logger.warn(
            `Failed to parse workspace awareness entry: ${error instanceof Error ? error.message : error}`,
          );
          return null;
        }
      })
      .filter((value): value is WorkspacePresenceState => value !== null);
  }
}
