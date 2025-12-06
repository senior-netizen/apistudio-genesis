import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { resolveAccountRole } from '../../common/security/owner-role.util';
import { JwtPayload } from './interfaces/jwt-payload.interface';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ExtractJwt, Strategy } = require('passport-jwt');

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    const secret = config.get<string>('app.jwt.secret');
    if (!secret) {
      // Fail fast in a predictable way instead of throwing obscure errors later.
      throw new Error('JWT secret is not configured. Set app.jwt.secret to enable authentication.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      this.logger.warn('Rejected JWT with malformed payload');
      throw new UnauthorizedException({ ok: false, message: 'Unauthorized — token missing or invalid', code: 'AUTH_401' });
    }
    const sessionId = payload.sid || payload.sessionId;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { email: true, role: true },
    });
    const email = user?.email ?? payload.email;
    const isFounder = payload?.isFounder === true || (user?.role ?? payload?.role) === 'founder';
    const role = resolveAccountRole(email, user?.role ?? payload?.role, isFounder);
    return { id: payload.sub, email, role, sessionId, isFounder: isFounder || role === 'founder' };
  }
}
