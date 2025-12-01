import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

type EventHandler = (message: string) => void;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private pubClient: RedisClient;
  private subClient: RedisClient;
  private readonly handlers = new Map<string, EventHandler>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.pubClient = new Redis(redisUrl);
    this.subClient = new Redis(redisUrl, { enableReadyCheck: false });

    this.subClient.on('message', (channel, message) => {
      const handler = this.handlers.get(channel);
      if (handler) {
        handler(message);
      }
    });
  }

  onModuleDestroy() {
    this.pubClient?.disconnect();
    this.subClient?.disconnect();
  }

  publish(channel: string, payload: unknown) {
    return this.pubClient.publish(channel, JSON.stringify(payload));
  }

  subscribe(channel: string, handler: EventHandler) {
    this.handlers.set(channel, handler);
    this.subClient.subscribe(channel, (error) => {
      if (error) {
        this.logger.error(`Failed to subscribe to ${channel}`, error.stack);
      } else {
        this.logger.log(`Subscribed to ${channel}`);
      }
    });
  }
}
