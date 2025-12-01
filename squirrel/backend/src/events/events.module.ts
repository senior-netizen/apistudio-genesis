// NestJS module that exposes the EventBus abstraction to the application.
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from '../infra/redis/redis.service';
import { EVENT_BUS } from './bus/event-bus.interface';
import { createEventBus } from './event-bus.factory';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EVENT_BUS,
      inject: [ConfigService, RedisService],
      useFactory: async (config: ConfigService, redisService: RedisService) => {
        const logger = new Logger('EventsModule');
        const natsUrl = config.get<string>('events.natsUrl') ?? process.env.NATS_URL;

        try {
          const redisPublisher = await redisService.getClient();
          const redisSubscriber = redisService.duplicate('events');
          return createEventBus({ natsUrl, redisPublisher, redisSubscriber, logger });
        } catch (error) {
          logger.warn(`Falling back to in-memory EventBus: ${(error as Error).message}`);
          return createEventBus({ natsUrl, logger });
        }
      },
    },
  ],
  exports: [EVENT_BUS],
})
export class EventsModule {}
