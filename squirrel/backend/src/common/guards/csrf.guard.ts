import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { CsrfService } from '../security/csrf.service';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = (request.method || 'GET').toUpperCase();
    if (!UNSAFE_METHODS.has(method)) {
      return true;
    }

    const hasSessionCookie = Boolean(request.cookies?.['refresh_token'] || request.cookies?.['XSRF-TOKEN']);
    const hasBearer = typeof request.headers['authorization'] === 'string';
    const hasApiKey = typeof request.headers['x-api-key'] === 'string';
    if (!hasSessionCookie && (hasBearer || hasApiKey)) {
      // Pure bearer/API key requests are not vulnerable to CSRF, maintain backward compatibility
      return true;
    }

    const headerToken = this.extract(request.headers['x-csrf-token']);
    const cookieToken = this.extract(request.cookies?.['XSRF-TOKEN']);
    const candidate = headerToken ?? cookieToken;

    if (!candidate || !this.csrf.isValid(candidate)) {
      throw new ForbiddenException({ code: 'CSRF_FORBIDDEN', message: 'Missing or invalid CSRF token' });
    }

    if (headerToken && cookieToken && headerToken !== cookieToken) {
      throw new ForbiddenException({ code: 'CSRF_MISMATCH', message: 'CSRF token mismatch' });
    }

    return true;
  }

  private extract(value: string | string[] | undefined): string | null {
    if (!value) return null;
    if (Array.isArray(value)) return value.find(Boolean) ?? null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
