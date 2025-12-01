import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ExtractJwt, Strategy } = require('passport-jwt');
import { ConfigService } from '@nestjs/config';

function extractRefreshToken(req: Request): string | null {
  const fromCookie = req.cookies?.['refresh_token'];
  if (fromCookie) return fromCookie;
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  return fromHeader ?? null;
}

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwt.secret'),
    });
  }

  async validate(payload: { sub: string; email: string; sid: string; jti?: string }) {
    return { id: payload.sub, email: payload.email, sessionId: payload.sid, jti: payload.jti };
  }
}

