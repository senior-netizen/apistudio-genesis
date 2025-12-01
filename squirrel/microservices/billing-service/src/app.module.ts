import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { InternalApiKeyMiddleware } from './common/middleware/internal-api-key.middleware';
import { RedisModule } from './config/redis.module';
import { DatabaseModule } from './config/database.module';
import { BillingModule } from './modules/billing/billing.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    RedisModule,
    DatabaseModule,
    BillingModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(InternalApiKeyMiddleware).exclude('health').forRoutes('*');
  }
}
