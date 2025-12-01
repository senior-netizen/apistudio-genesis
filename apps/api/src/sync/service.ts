import { randomUUID } from 'node:crypto';
import {
  InMemorySyncStorage,
  type ChangeEnvelope,
  type SyncHandshakeResponse,
  type SyncPullRequest,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
  type SyncAck,
} from '@sdl/sync-core';
import { createLogger } from '@squirrel/observability';

interface SessionState {
  token: string;
  workspaceId: string;
  deviceId: string;
  expiresAt: number;
}

const SESSION_TTL_MS = 5 * 60 * 1000;

export class MemorySyncCoordinator {
  // TODO(scales): swap to Redis-backed storage and session cache to keep instances stateless.
  private readonly storage = new InMemorySyncStorage();
  private readonly sessions = new Map<string, SessionState>();
  private serverEpoch = 0;
  private readonly logger = createLogger({ serviceName: 'api-memory-sync' });

  handshake(request: {
    workspaceId: string;
    deviceId?: string;
  }): SyncHandshakeResponse {
    const deviceId = request.deviceId ?? randomUUID();
    const token = randomUUID();
    this.sessions.set(token, {
      token,
      workspaceId: request.workspaceId,
      deviceId,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return {
      serverTime: new Date().toISOString(),
      protocolVersion: '1.0.0',
      deviceId,
      sessionToken: token,
      lastEpoch: this.serverEpoch,
    };
  }

  verifySession(token: string) {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
  }

  async pull(request: SyncPullRequest): Promise<SyncPullResponse> {
    this.logger.debug({ scopeType: request.scopeType, scopeId: request.scopeId, since: request.sinceEpoch }, 'sync pull');
    const changes = await this.storage.loadChanges(request.scopeType, request.scopeId, request.sinceEpoch);
    return {
      changes,
      snapshot: null,
    };
  }

  async push(request: SyncPushRequest): Promise<SyncPushResponse> {
    if (request.changes.length === 0) {
      return { ack: { minEpoch: this.serverEpoch, maxEpoch: this.serverEpoch }, conflicts: [] };
    }
    this.logger.debug({ size: request.changes.length }, 'sync push');
    const assigned: ChangeEnvelope[] = [];
    for (const change of request.changes) {
      this.serverEpoch += 1;
      assigned.push({
        ...change,
        serverEpoch: this.serverEpoch,
        createdAt: new Date().toISOString(),
      });
    }
    await this.storage.appendChanges(assigned);
    const ack: SyncAck = {
      minEpoch: assigned[0].serverEpoch,
      maxEpoch: assigned[assigned.length - 1].serverEpoch,
    };
    return {
      ack,
      conflicts: [],
    };
  }
}
