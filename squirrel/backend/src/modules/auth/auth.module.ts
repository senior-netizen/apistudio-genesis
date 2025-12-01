import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RefreshJwtStrategy } from './refresh.strategy';
import { DeviceFlowService } from './device-flow.service';
import { UsersModule } from '../users/users.module';
import { FounderProvisionerService } from './founder-provisioner.service';
import { CsrfService } from '../../common/security/csrf.service';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('app.jwt.expiresIn'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshJwtStrategy, DeviceFlowService, FounderProvisionerService, CsrfService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
