import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import type { AwarenessSnapshot } from '../types';

const SNAPSHOT_THRESHOLD = 50;

type RoomRecord = {
  doc: Y.Doc;
  awareness: Awareness;
  workspaceId: string;
  docId: string;
  requestId?: string | null;
  version: number;
  updateCount: number;
};

type RemoteUpdateListener = (roomId: string, update: Uint8Array, actorId?: string) => void;

type UpdatePayload = {
  roomId: string;
  workspaceId: string;
  docId: string;
  requestId?: string | null;
  update: Uint8Array;
  actorId?: string;
};

type SerializedUpdate = {
  roomId: string;
  workspaceId: string;
  docId: string;
  requestId?: string | null;
  update: string;
  actorId?: string;
  nodeId: string;
};

@Injectable()
export class YjsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YjsService.name);
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly emitter = new EventEmitter();
  private subscriber?: Redis;
  private readonly nodeId = randomUUID();

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  async onModuleInit() {
    try {
      this.subscriber = this.redis.duplicate('yjs:sub');
      this.subscriber.on('pmessage', (_, channel, message) => this.handleRemoteUpdate(channel, message));
      await this.subscriber.psubscribe('collab:yjs:*');
    } catch (error) {
      this.logger.error(`Failed to initialize Yjs Redis subscription: ${error instanceof Error ? error.message : error}`);
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  onRemoteUpdate(listener: RemoteUpdateListener) {
    this.emitter.on('remote-update', listener);
  }

  async ensureRoom(roomId: string, workspaceId: string, docId: string, requestId?: string | null): Promise<RoomRecord> {
    const existing = this.rooms.get(roomId);
    if (existing) {
      return existing;
    }
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    let version = 0;
    try {
      const snapshot = await this.prisma.docSnapshot.findFirst({
        where: { workspaceId, docId },
        orderBy: { version: 'desc' },
      });
      if (snapshot) {
        Y.applyUpdate(doc, new Uint8Array(snapshot.snapshot as Buffer));
        version = snapshot.version;
      }
    } catch (error) {
      this.logger.warn(`Failed to load Yjs snapshot for ${roomId}: ${error instanceof Error ? error.message : error}`);
    }
    try {
      const client = await this.redis.getClient();
      const updates = await client.lrange(this.updatesKey(roomId), 0, -1);
      for (const value of updates) {
        try {
          const update = Buffer.from(value, 'base64');
          Y.applyUpdate(doc, update);
        } catch (error) {
          this.logger.warn(`Failed to apply cached update for ${roomId}: ${error instanceof Error ? error.message : error}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to hydrate Yjs updates for ${roomId}: ${error instanceof Error ? error.message : error}`);
    }
    const record: RoomRecord = {
      doc,
      awareness,
      workspaceId,
      docId,
      requestId: requestId ?? null,
      version,
      updateCount: 0,
    };
    this.rooms.set(roomId, record);
    return record;
  }

  async getStateVector(roomId: string, workspaceId: string, docId: string, requestId?: string | null): Promise<string> {
    const record = await this.ensureRoom(roomId, workspaceId, docId, requestId);
    const update = Y.encodeStateAsUpdate(record.doc);
    return Buffer.from(update).toString('base64');
  }

  async applyUpdate(options: UpdatePayload): Promise<void> {
    const record = await this.ensureRoom(options.roomId, options.workspaceId, options.docId, options.requestId);
    Y.applyUpdate(record.doc, options.update);
    record.updateCount += 1;
    await this.persistUpdate(options.roomId, options.update, {
      workspaceId: options.workspaceId,
      docId: options.docId,
      requestId: options.requestId,
      actorId: options.actorId,
    });
    if (record.updateCount >= SNAPSHOT_THRESHOLD) {
      await this.persistSnapshot(options.roomId, record);
    }
  }

  async updateAwareness(roomId: string, socketId: string, state: AwarenessSnapshot[string]): Promise<void> {
    const client = await this.redis.getClient();
    const key = this.awarenessKey(roomId);
    await client.hset(key, socketId, JSON.stringify(state));
    await client.expire(key, 120);
  }

  async removeAwareness(roomId: string, socketId: string): Promise<void> {
    const client = await this.redis.getClient();
    await client.hdel(this.awarenessKey(roomId), socketId);
  }

  async getAwareness(roomId: string): Promise<AwarenessSnapshot> {
    const client = await this.redis.getClient();
    const raw = await client.hgetall(this.awarenessKey(roomId));
    const snapshot: AwarenessSnapshot = {};
    for (const [socketId, value] of Object.entries(raw ?? {})) {
      try {
        const parsed = JSON.parse(value) as AwarenessSnapshot[string];
        snapshot[socketId] = parsed;
      } catch (error) {
        this.logger.warn(`Failed to parse awareness state for ${roomId}: ${error instanceof Error ? error.message : error}`);
      }
    }
    return snapshot;
  }

  private async persistUpdate(
    roomId: string,
    update: Uint8Array,
    metadata: { workspaceId: string; docId: string; requestId?: string | null; actorId?: string },
  ) {
    try {
      const client = await this.redis.getClient();
      await client.rpush(this.updatesKey(roomId), Buffer.from(update).toString('base64'));
      await client.ltrim(this.updatesKey(roomId), -500, -1);
      const payload: SerializedUpdate = {
        roomId,
        workspaceId: metadata.workspaceId,
        docId: metadata.docId,
        requestId: metadata.requestId ?? undefined,
        update: Buffer.from(update).toString('base64'),
        actorId: metadata.actorId,
        nodeId: this.nodeId,
      };
      await client.publish(this.channel(roomId), JSON.stringify(payload));
    } catch (error) {
      this.logger.warn(`Failed to persist Yjs update for ${roomId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async persistSnapshot(roomId: string, record: RoomRecord) {
    try {
      const state = Y.encodeStateAsUpdate(record.doc);
      record.version += 1;
      record.updateCount = 0;
      await this.prisma.docSnapshot.create({
        data: {
          workspaceId: record.workspaceId,
          requestId: record.requestId ?? undefined,
          docId: record.docId,
          version: record.version,
          snapshot: Buffer.from(state),
        },
      });
      const client = await this.redis.getClient();
      await client.del(this.updatesKey(roomId));
    } catch (error) {
      this.logger.warn(`Failed to persist Yjs snapshot for ${roomId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async handleRemoteUpdate(channel: string, message: string) {
    if (!channel.startsWith('collab:yjs:')) {
      return;
    }
    try {
      const parsed = JSON.parse(message) as SerializedUpdate;
      if (!parsed || parsed.nodeId === this.nodeId) {
        return;
      }
      const update = Buffer.from(parsed.update, 'base64');
      await this.ensureRoom(parsed.roomId, parsed.workspaceId, parsed.docId, parsed.requestId);
      const record = this.rooms.get(parsed.roomId);
      if (!record) {
        return;
      }
      Y.applyUpdate(record.doc, update);
      record.updateCount += 1;
      if (record.updateCount >= SNAPSHOT_THRESHOLD) {
        await this.persistSnapshot(parsed.roomId, record);
      }
      this.emitter.emit('remote-update', parsed.roomId, update, parsed.actorId);
    } catch (error) {
      this.logger.warn(`Failed to process remote Yjs update: ${error instanceof Error ? error.message : error}`);
    }
  }

  private updatesKey(roomId: string) {
    return `yjs:updates:${roomId}`;
  }

  private awarenessKey(roomId: string) {
    return `awareness:${roomId}`;
  }

  private channel(roomId: string) {
    return `collab:yjs:${roomId}`;
  }
}
