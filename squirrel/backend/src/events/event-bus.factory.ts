// EventBus factory that wires NATS or Redis when available and safely falls back to in-memory delivery.
import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { EventBus } from './bus/event-bus.interface';
import { InMemoryEventBus } from './bus/in-memory-event-bus';
import { NatsEventBus } from './bus/nats-event-bus';
import { RedisEventBus } from './bus/redis-event-bus';

export interface EventBusFactoryOptions {
  natsUrl?: string;
  redisPublisher?: Redis;
  redisSubscriber?: Redis;
  logger?: Logger;
}

export function createEventBus(options: EventBusFactoryOptions = {}): EventBus {
  const logger = options.logger ?? new Logger('EventBusFactory');

  if (options.natsUrl) {
    logger.log('Using NATS-backed EventBus');
    return new NatsEventBus({ url: options.natsUrl, logger });
  }

  if (options.redisPublisher && options.redisSubscriber) {
    logger.log('Using Redis-backed EventBus');
    return new RedisEventBus({
      publisher: options.redisPublisher,
      subscriber: options.redisSubscriber,
      logger,
    });
  }

  logger.log('Using in-memory EventBus (default)');
  return new InMemoryEventBus();
}
