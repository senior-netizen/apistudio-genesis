import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

type Handler = (channel: string, payload: Record<string, unknown>) => void;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private publisher: RedisClient;
  private subscriber: RedisClient;
  private readonly handlers: Handler[] = [];

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    this.subscriber.on('message', (channel, message) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(message);
      } catch (error) {
        this.logger.error(`Failed to parse Redis message on ${channel}`, error.stack);
        return;
      }
      this.handlers.forEach((handler) => handler(channel, payload));
    });

    const channels = [
      'user.created',
      'workspace.created',
      'api.request.executed',
      'billing.plan.changed',
      'ai.advisor.response',
      'notifications.dispatch',
    ];
    this.subscriber.subscribe(...channels, (error, count) => {
      if (error) {
        this.logger.error('Failed to subscribe to channels', error.stack);
      } else {
        this.logger.log(`Subscribed to ${count} Redis channels`);
      }
    });
  }

  onModuleDestroy() {
    this.publisher?.disconnect();
    this.subscriber?.disconnect();
  }

  publish(channel: string, payload: Record<string, unknown>) {
    return this.publisher.publish(channel, JSON.stringify(payload));
  }

  addListener(handler: Handler) {
    this.handlers.push(handler);
  }

  async ping(): Promise<boolean> {
    try {
      await this.publisher?.ping();
      await this.subscriber?.ping();
      return true;
    } catch (error) {
      this.logger.warn('Redis ping failed', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  getStatus() {
    return {
      publisher: this.publisher?.status ?? 'unknown',
      subscriber: this.subscriber?.status ?? 'unknown',
    };
  }
}
