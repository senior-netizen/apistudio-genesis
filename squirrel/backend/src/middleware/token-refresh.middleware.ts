import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../modules/auth/auth.service';
import { CsrfService } from '../common/security/csrf.service';

// Middleware that auto-rotates access token if near expiry and refresh cookie is present.
@Injectable()
export class TokenRefreshMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      const refresh = req.cookies?.['refresh_token'];
      if (!token || !refresh) return next();
      const decoded = this.jwt.decode(token) as { exp?: number; sub?: string; sid?: string; email?: string } | null;
      if (!decoded?.exp) return next();
      const expiresInSec = decoded.exp * 1000 - Date.now();
      if (expiresInSec > 60_000) return next();
      // Rotate via refresh endpoint logic
      const tokens = await this.auth.refresh({ refreshToken: refresh });
      res.setHeader('x-access-token', tokens.accessToken);
      // Also ensure cookie is extended
      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: this.isSecure(),
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      const csrfToken = this.csrf.generateToken();
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false,
        secure: this.isSecure(),
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
    } catch {
      // ignore and continue
    } finally {
      next();
    }
  }

  private isSecure(): boolean {
    return (this.config.get<string>('app.nodeEnv') ?? 'development') === 'production';
  }
}

