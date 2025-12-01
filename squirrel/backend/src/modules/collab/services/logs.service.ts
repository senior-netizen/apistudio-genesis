import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type Redis from 'ioredis';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import type { LogEntry } from '../types';

type RequestLogRecord = {
  timestamp: Date;
  userId?: string | null;
  requestId?: string | null;
  method: string;
  url: string;
  status?: number | null;
  durationMs?: number | null;
  sizeBytes?: number | null;
  environment?: string | null;
  error?: string | null;
};

@Injectable()
export class CollabLogsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollabLogsService.name);
  private readonly emitter = new EventEmitter();
  private subscriber?: Redis;

  constructor(private readonly redis: RedisService, private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      this.subscriber = this.redis.duplicate('logs:sub');
      this.subscriber.on('pmessage', (_, channel, message) => this.handleMessage(channel, message));
      await this.subscriber.psubscribe('logs:workspace:*');
    } catch (error) {
      this.logger.error(`Failed to initialize logs subscription: ${error instanceof Error ? error.message : error}`);
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  onLog(listener: (workspaceId: string, entry: LogEntry) => void) {
    this.emitter.on('log', listener);
  }

  emitLocal(workspaceId: string, entry: LogEntry) {
    this.emitter.emit('log', workspaceId, entry);
  }

  async getRecent(workspaceId: string, limit = 50): Promise<LogEntry[]> {
    const records = (await this.prisma.requestLog.findMany({
      where: { workspaceId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })) as RequestLogRecord[];
    return records
      .map((record) => ({
        timestamp: record.timestamp.toISOString(),
        userId: record.userId ?? undefined,
        requestId: record.requestId ?? undefined,
        method: record.method,
        url: record.url,
        status: record.status ?? undefined,
        durationMs: record.durationMs ?? undefined,
        sizeBytes: record.sizeBytes ?? undefined,
        environment: record.environment ?? undefined,
        error: record.error ?? undefined,
      }))
      .reverse();
  }

  private handleMessage(channel: string, message: string) {
    if (!channel.startsWith('logs:workspace:')) {
      return;
    }
    const workspaceId = channel.substring('logs:workspace:'.length);
    try {
      const parsed = JSON.parse(message) as LogEntry;
      if (!parsed.timestamp) {
        parsed.timestamp = new Date().toISOString();
      }
      this.emitter.emit('log', workspaceId, parsed);
    } catch (error) {
      this.logger.warn(`Failed to process log message for ${workspaceId}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
