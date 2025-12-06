import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface ServiceIdentityClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  claims?: { scopes?: string[] };
}

export interface ServiceIdentityResult {
  valid: boolean;
  reason?: string;
  claims?: ServiceIdentityClaims;
}

export interface ServiceIdentityOptions {
  requiredScopes?: string[];
  audience?: string;
  issuer?: string;
  sharedSecret: string;
  enforceTls?: boolean;
}

export function verifyServiceIdentity(req: Request, options: ServiceIdentityOptions): ServiceIdentityResult {
  if (options.enforceTls && req.protocol !== 'https') {
    return { valid: false, reason: 'TLS is required for service calls' };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, reason: 'Missing service identity token' };
  }
  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, options.sharedSecret, {
      audience: options.audience,
      issuer: options.issuer,
    }) as ServiceIdentityClaims;

    const scopes = decoded.claims?.scopes ?? [];
    if (options.requiredScopes?.length) {
      const missing = options.requiredScopes.filter((scope) => !scopes.includes(scope));
      if (missing.length) {
        return { valid: false, reason: `Missing scopes: ${missing.join(', ')}` };
      }
    }

    return { valid: true, claims: decoded };
  } catch (err) {
    return { valid: false, reason: (err as Error).message };
  }
}

export function createServiceIdentityMiddleware(options: ServiceIdentityOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = verifyServiceIdentity(req, options);
    if (!result.valid) {
      res.status(401).json({ message: result.reason ?? 'Invalid service identity' });
      return;
    }
    (req as Request & { serviceIdentity?: ServiceIdentityClaims }).serviceIdentity = result.claims;
    next();
  };
}
