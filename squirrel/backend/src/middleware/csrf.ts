import { NextFunction, Request, Response } from 'express';
import { SessionData } from './session';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const normalizeHeader = (value: string | string[] | undefined): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.find(Boolean) ?? null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const csrfMiddleware = (req: Request & { session?: SessionData }, res: Response, next: NextFunction) => {
  const method = (req.method || 'GET').toUpperCase();
  if (!UNSAFE_METHODS.has(method)) {
    return next();
  }

  const sessionToken = req.session?.csrfToken;
  const headerToken = normalizeHeader(req.headers['x-csrf-token']);

  if (!sessionToken || !headerToken || headerToken !== sessionToken) {
    return res.status(403).json({ message: 'Forbidden by CSRF middleware' });
  }

  return next();
};

export default csrfMiddleware;
export { UNSAFE_METHODS };
