import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { CacheService } from './cache/cache.service';
import { MetricsService } from './metrics/metrics.service';
import { QueueService } from './queue/queue.service';
import { CryptoService } from '../common/security/crypto.service';
import { AppLogger } from './logger/app-logger.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, CacheService, MetricsService, QueueService, CryptoService, AppLogger],
  exports: [PrismaService, RedisService, CacheService, MetricsService, QueueService, CryptoService, AppLogger],
})
export class InfraModule {}
