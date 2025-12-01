import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private readonly optionalAuthPatterns: RegExp[];

  constructor(private readonly configService: ConfigService) {
    const defaults = [
      /^\/health$/, // health checks
      /^\/docs(\/.*)?$/, // swagger docs
      /^\/api\/(v\d+\/)?auth\/(csrf|login|register|signup|refresh|forgot-password|reset-password|verify).*$/,
      /^\/api\/(v\d+\/)?public\//,
      /^\/socket.io\//, // websocket handshakes
    ];

    const optionalFromEnv = (this.configService.get<string>('JWT_OPTIONAL_PATHS') || '')
      .split(',')
      .map((pattern) => pattern.trim())
      .filter(Boolean)
      .map((pattern) => {
        try {
          return new RegExp(pattern);
        } catch (error) {
          return null;
        }
      })
      .filter((pattern): pattern is RegExp => pattern !== null);

    this.optionalAuthPatterns = [...defaults, ...optionalFromEnv];
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const requestPath = req.path || req.url || '';
    const originalPath = req.originalUrl || requestPath;
    const isOptional = this.optionalAuthPatterns.some(
      (pattern) => pattern.test(requestPath) || pattern.test(originalPath),
    );

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      if (isOptional) {
        return next();
      }
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (!token || (scheme && scheme.toLowerCase() !== 'bearer')) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Gateway misconfiguration: missing JWT secret');
    }

    try {
      const decoded = jwt.verify(token, secret) as Record<string, unknown>;

      if (decoded) {
        const roles = decoded['roles'];
        if (roles && !Array.isArray(roles)) {
          decoded['roles'] = [roles];
        }
      }

      (req as Request & { user?: Record<string, unknown> }).user = decoded;
      return next();
    } catch (error) {
      if (isOptional && error instanceof jwt.TokenExpiredError) {
        // Allow gracefully for optional routes where an expired token is acceptable.
        return next();
      }
      throw new UnauthorizedException(
        error instanceof Error ? `Invalid token: ${error.message}` : 'Invalid token',
      );
    }
  }
}
