import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.tokens';
import appConfig from '../../config/configuration';

@Global()
@Module({})
export class RedisInfraModule {
  static forRoot(): DynamicModule {
    return {
      module: RedisInfraModule,
      imports: [ConfigModule.forFeature(appConfig)],
      providers: [
        {
          provide: REDIS_CLIENT,
          inject: [appConfig.KEY],
          useFactory: (config: ConfigType<typeof appConfig>) => {
            return new Redis(config.redis.url, {
              lazyConnect: false,
              maxRetriesPerRequest: 3,
            });
          },
        },
      ],
      exports: [REDIS_CLIENT],
    };
  }
}
