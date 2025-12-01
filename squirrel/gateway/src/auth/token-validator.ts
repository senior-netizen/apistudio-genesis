import jwt from 'jsonwebtoken';

const FALLBACK_SECRET = process.env.JWT_SECRET || 'test-secret-squirrel';

export function validateBearerToken(authHeader?: string | string[]): boolean {
  if (!authHeader) return false;
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header.toLowerCase().startsWith('bearer ')) return false;
  const token = header.slice('bearer '.length);
  try {
    jwt.verify(token, FALLBACK_SECRET);
    return true;
  } catch {
    return false;
  }
}
