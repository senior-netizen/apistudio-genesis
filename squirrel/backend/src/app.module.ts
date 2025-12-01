import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { InfraModule } from './infra/infra.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { RequestsModule } from './modules/requests/requests.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { VariablesModule } from './modules/variables/variables.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FilesModule } from './modules/files/files.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { SyncModule } from './sync/sync.module';
import { HealthController as HeartbeatController } from './health/health.controller';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TokenRefreshMiddleware } from './middleware/token-refresh.middleware';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import { RedisInfraModule } from './infrastructure/redis/redis.module';
import { CollabModule } from './modules/collab/collab.module';
import { BillingModule } from './modules/billing/billing.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { SupportModule } from './modules/support/support.module';
import { CsrfService } from './common/security/csrf.service';
import { CsrfGuard } from './common/guards/csrf.guard';
import { EventsModule } from './events/events.module';
import { RedisRateLimitMiddleware } from './middlewares/redis-rate-limit.middleware';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    RedisInfraModule.forRoot(),
    InfraModule,
    EventsModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    CollectionsModule,
    RequestsModule,
    EnvironmentsModule,
    VariablesModule,
    RealtimeModule,
    SearchModule,
    AnalyticsModule,
    FilesModule,
    AiModule,
    AdminModule,
    HealthModule,
    SyncModule,
    CollabModule,
    BillingModule,
    MarketplaceModule,
    SupportModule,
  ],
  controllers: [HeartbeatController],
  providers: [
    RateLimitGuard,
    CsrfGuard,
    IdempotencyInterceptor,
    JwtAuthGuard,
    TokenRefreshMiddleware,
    CsrfService,
    ResponseEnvelopeInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware, RequestLoggingMiddleware, RedisRateLimitMiddleware, TokenRefreshMiddleware).forRoutes('*');
  }
}
