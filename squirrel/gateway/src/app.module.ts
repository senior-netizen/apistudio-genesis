import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { OrgRolesGuard } from './common/guards/org-roles.guard';
import { OrganizationContextResolver } from './common/resolvers/organization-context.resolver';
import { JwtAuthMiddleware } from './common/middleware/jwt-auth.middleware';
import { InternalKeyMiddleware } from './common/middleware/internal-key.middleware';
import { RedisModule } from './config/redis.module';
import { RoutingModule } from './modules/routing/routing.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { HealthService } from './health.service';
import { CsrfModule } from './modules/csrf/csrf.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_DURATION ?? 60),
        limit: Number(process.env.RATE_LIMIT_POINTS ?? 1000),
      },
    ]),
    RedisModule,
    RoutingModule,
    WebsocketModule,
    AdminModule,
    CsrfModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    OrganizationContextResolver,
    {
      provide: APP_GUARD,
      useClass: OrgRolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware, InternalKeyMiddleware)
      .exclude(
        'health',
        'docs',
        { path: 'auth/csrf', method: RequestMethod.ALL },
        { path: '/auth/csrf', method: RequestMethod.ALL },
        { path: 'api/auth/csrf', method: RequestMethod.ALL },
        { path: '/api/auth/csrf', method: RequestMethod.ALL },
        { path: 'api/v1/auth/csrf', method: RequestMethod.ALL },
        { path: '/api/v1/auth/csrf', method: RequestMethod.ALL },
        { path: 'v1/auth/csrf', method: RequestMethod.ALL },
        { path: '/v1/auth/csrf', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
