import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { InfraModule } from '../infra/infra.module';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { WorkspacesModule } from '../modules/workspaces/workspaces.module';
import { RequestsModule } from '../modules/requests/requests.module';
import { AuthGrpcController } from './controllers/auth.grpc.controller';
import { WorkspacesGrpcController } from './controllers/workspaces.grpc.controller';
import { RequestsGrpcController } from './controllers/requests.grpc.controller';
import { AuthDomainModule } from '../services/auth/auth.domain.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GrpcRateLimitInterceptor } from './interceptors/grpc-rate-limit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    InfraModule,
    AuthModule,
    AuthDomainModule,
    UsersModule,
    WorkspacesModule,
    RequestsModule,
  ],
  controllers: [AuthGrpcController, WorkspacesGrpcController, RequestsGrpcController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: GrpcRateLimitInterceptor,
    },
  ],
})
export class GrpcAppModule {}
