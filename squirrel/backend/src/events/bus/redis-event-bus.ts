// Redis Streams adapter used as a fallback when NATS is unavailable.
// The Redis dependency is optional and will only be wired when configured.
import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { DomainEvent } from '../contracts';
import { EventBus, EventHandler, EventSubscription } from './event-bus.interface';

export interface RedisEventBusOptions {
  publisher: Redis;
  subscriber: Redis;
  stream?: string;
  logger?: Logger;
}

export class RedisEventBus implements EventBus {
  private readonly stream: string;
  private readonly logger: Logger;

  constructor(private readonly options: RedisEventBusOptions) {
    this.stream = options.stream ?? 'events:stream';
    this.logger = options.logger ?? new Logger(RedisEventBus.name);
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    await this.options.publisher.xadd(
      this.stream,
      '*',
      'event',
      JSON.stringify(event),
    );
    await this.options.publisher.publish(event.name, JSON.stringify(event));
  }

  async subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>): Promise<EventSubscription> {
    const listener = async (_channel: string, message: string) => {
      try {
        const parsed = JSON.parse(message) as DomainEvent<TPayload>;
        await handler(parsed);
      } catch (error) {
        this.logger.error(`Failed to handle Redis event ${eventName}`, error as Error);
      }
    };
    await this.options.subscriber.subscribe(eventName);
    this.options.subscriber.on('message', listener);
    return {
      unsubscribe: async () => {
        this.options.subscriber.off('message', listener);
        await this.options.subscriber.unsubscribe(eventName);
      },
    };
  }
}
