import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import {
  InMemorySyncStorage,
  type ChangeEnvelope,
  type SyncHandshakeResponse,
  type SyncPullRequest,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
  type SyncAck,
} from "@sdl/sync-core";
import { createLogger } from "@squirrel/observability";

interface SessionState {
  token: string;
  workspaceId: string;
  deviceId: string;
  expiresAt: number;
}

const SESSION_TTL_MS = 5 * 60 * 1000;

export class MemorySyncCoordinator {
  private readonly fallbackStorage = new InMemorySyncStorage();
  private readonly fallbackSessions = new Map<string, SessionState>();
  private readonly redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : null;
  private serverEpoch = 0;
  private readonly logger = createLogger({ serviceName: "api-memory-sync" });

  handshake(request: {
    workspaceId: string;
    deviceId?: string;
  }): SyncHandshakeResponse {
    const deviceId = request.deviceId ?? randomUUID();
    const token = randomUUID();
    const session: SessionState = {
      token,
      workspaceId: request.workspaceId,
      deviceId,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    void this.persistSession(session);

    return {
      serverTime: new Date().toISOString(),
      protocolVersion: "1.0.0",
      deviceId,
      sessionToken: token,
      lastEpoch: this.serverEpoch,
    };
  }

  verifySession(token: string) {
    return this.verifySessionAsync(token);
  }

  private async verifySessionAsync(
    token: string,
  ): Promise<SessionState | null> {
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

  private async requireSession(
    token: string | undefined,
    workspaceId: string,
  ): Promise<SessionState> {
    if (!token) {
      this.logger.warn("missing sync session token");
      throw new Error("Missing sync session token");
    }

    const session = await this.verifySessionAsync(token);
    if (!session) {
      this.logger.warn({ token }, "invalid or expired sync session");
      throw new Error("Invalid or expired sync session");
    }

    if (session.workspaceId !== workspaceId) {
      this.logger.warn(
        {
          token,
          sessionWorkspace: session.workspaceId,
          requestWorkspace: workspaceId,
        },
        "sync session workspace mismatch",
      );
      throw new Error("Session does not grant access to requested workspace");
    }

    return session;
  }

  async pull(request: SyncPullRequest): Promise<SyncPullResponse> {
    await this.requireSession(request.sessionToken, request.workspaceId);
    this.logger.debug(
      {
        scopeType: request.scopeType,
        scopeId: request.scopeId,
        since: request.sinceEpoch,
      },
      "sync pull",
    );

    if (!this.redis) {
      const changes = await this.fallbackStorage.loadChanges(
        request.scopeType,
        request.scopeId,
        request.sinceEpoch,
      );
      return {
        changes,
        snapshot: null,
      };
    }

    const key = this.scopeChangesKey(request.scopeType, request.scopeId);
    const rows = await this.redis.zrangebyscore(
      key,
      request.sinceEpoch + 1,
      "+inf",
    );
    const changes = rows
      .map((row) => {
        try {
          return JSON.parse(row) as ChangeEnvelope;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is ChangeEnvelope => Boolean(entry));

    return {
      changes,
      snapshot: null,
    };
  }

  async push(request: SyncPushRequest): Promise<SyncPushResponse> {
    await this.requireSession(request.sessionToken, request.workspaceId);
    if (request.changes.length === 0) {
      return {
        ack: { minEpoch: this.serverEpoch, maxEpoch: this.serverEpoch },
        conflicts: [],
      };
    }
    this.logger.debug({ size: request.changes.length }, "sync push");

    const assigned: ChangeEnvelope[] = [];
    for (const change of request.changes) {
      const nextEpoch = await this.nextEpoch();
      assigned.push({
        ...change,
        serverEpoch: nextEpoch,
        createdAt: new Date().toISOString(),
      });
    }

    if (!this.redis) {
      await this.fallbackStorage.appendChanges(assigned);
    } else {
      const pipeline = this.redis.pipeline();
      for (const change of assigned) {
        pipeline.zadd(
          this.scopeChangesKey(change.scopeType, change.scopeId),
          change.serverEpoch,
          JSON.stringify(change),
        );
      }
      await pipeline.exec();
    }

    const ack: SyncAck = {
      minEpoch: assigned[0].serverEpoch,
      maxEpoch: assigned[assigned.length - 1].serverEpoch,
    };
    return {
      ack,
      conflicts: [],
    };
  }

  private async nextEpoch() {
    if (!this.redis) {
      this.serverEpoch += 1;
      return this.serverEpoch;
    }
    const next = await this.redis.incr("sync:server-epoch");
    this.serverEpoch = next;
    return next;
  }

  private async persistSession(session: SessionState) {
    if (!this.redis) {
      this.fallbackSessions.set(session.token, session);
      return;
    }
    await this.redis.set(
      this.sessionKey(session.token),
      JSON.stringify(session),
      "PX",
      SESSION_TTL_MS,
    );
  }

  private async loadSession(token: string): Promise<SessionState | null> {
    if (!this.redis) {
      return this.fallbackSessions.get(token) ?? null;
    }
    const raw = await this.redis.get(this.sessionKey(token));
    return raw ? (JSON.parse(raw) as SessionState) : null;
  }

  private async deleteSession(token: string) {
    if (!this.redis) {
      this.fallbackSessions.delete(token);
      return;
    }
    await this.redis.del(this.sessionKey(token));
  }

  private sessionKey(token: string) {
    return `sync:session:${token}`;
  }

  private scopeChangesKey(scopeType: string, scopeId: string) {
    return `sync:changes:${scopeType}:${scopeId}`;
  }
}
