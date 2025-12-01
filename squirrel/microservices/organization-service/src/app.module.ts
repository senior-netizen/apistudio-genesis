import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { InternalApiKeyMiddleware } from './common/middleware/internal-api-key.middleware';
import { RolesGuard } from './common/guards/roles.guard';
import { RedisModule } from './config/redis.module';
import { DatabaseModule } from './config/database.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TeamsModule } from './modules/teams/teams.module';
import { MembersModule } from './modules/members/members.module';
import { InvitesModule } from './modules/invites/invites.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { SharedWorkspacesModule } from './modules/shared-workspaces/shared-workspaces.module';
import { SchemasModule } from './modules/schemas/schemas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 150 }]),
    RedisModule,
    DatabaseModule,
    OrganizationsModule,
    TeamsModule,
    MembersModule,
    InvitesModule,
    RolesModule,
    PermissionsModule,
    SharedWorkspacesModule,
    SchemasModule,
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
