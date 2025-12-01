export interface JwtPayload {
  sub: string;
  email: string;
  role?: string | null;
  sid?: string;
  sessionId?: string;
  jti?: string;
}
