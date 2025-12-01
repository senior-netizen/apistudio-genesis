import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { RedisService } from '../../config/redis.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe('ai.advisor.response', (message) => {
      this.logger.debug(`Received AI advisor response: ${message}`);
    });
  }

  async login(payload: LoginDto) {
    // TODO: Replace with integration against the existing monolith authentication service.
    this.logger.log(`Delegating login for ${payload.email}`);
    await this.redisService.publish('user.created', { email: payload.email, type: 'login' });
    const token = jwt.sign({ email: payload.email }, this.configService.get('JWT_PRIVATE_KEY'), {
      algorithm: 'HS256',
      expiresIn: '15m',
    });
    return { token };
  }

  async signup(payload: SignupDto) {
    this.logger.log(`Delegating signup for ${payload.email}`);
    await this.redisService.publish('user.created', { email: payload.email, type: 'signup' });
    return { status: 'queued', email: payload.email };
  }

  async verifyInternalToken(authorization: string) {
    if (!authorization) {
      return { valid: false };
    }

    try {
      const token = authorization.replace('Bearer ', '');
      const decoded = jwt.verify(token, this.configService.get('JWT_PUBLIC_KEY')) as Record<string, unknown>;
      await this.redisService.publish('auth.token.verified', decoded);
      return { valid: true, decoded };
    } catch (error) {
      this.logger.warn(`Failed to verify token: ${error.message}`);
      return { valid: false };
    }
  }
}
