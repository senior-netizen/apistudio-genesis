import { createHmac, createHash, randomUUID } from 'node:crypto';

export const TEST_JWT_SECRET = 'test-secret-squirrel';
export const TEST_REFRESH_SECRET = 'test-refresh-secret';
export const TEST_API_KEY = 'squirrel-test-api-key';

export interface MockUser {
  id: string;
  email: string;
  password: string;
  role: 'owner' | 'founder' | 'admin' | 'user';
  active?: boolean;
  disabled?: boolean;
  workspaceId?: string;
}

export interface MockApiKey {
  id: string;
  keyHash: string;
  revoked?: boolean;
  expiresAt?: Date | null;
  workspaceId?: string;
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: overrides.id ?? randomUUID(),
  email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@squirrel.test`,
  password: overrides.password ?? 'correct-horse-battery-staple',
  role: overrides.role ?? 'user',
  workspaceId: overrides.workspaceId ?? 'workspace-123',
  active: overrides.active ?? true,
  disabled: overrides.disabled ?? false,
});

const base64url = (input: string | Buffer) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

export const signJwt = (
  payload: Record<string, unknown>,
  secret = TEST_JWT_SECRET,
  expiresInSeconds = 60 * 15,
): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSeconds, ...payload };
  const encoded = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
};

export const tamperToken = (token: string): string => {
  const parts = token.split('.');
  if (parts.length !== 3) return token + 'broken';
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  payload.email = `${payload.email}-tampered`;
  parts[1] = base64url(JSON.stringify(payload));
  return parts.join('.') + 'bit';
};

export const unsignedToken = (payload: Record<string, unknown>): string => {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.`;
};

export const expiredToken = (payload: Record<string, unknown>, secret = TEST_JWT_SECRET): string =>
  signJwt({ ...payload, exp: Math.floor(Date.now() / 1000) - 30 }, secret, -30);

export const apiKeyHash = (apiKey: string) => createHash('sha256').update(apiKey).digest('hex');

export const createMockApiKey = (overrides: Partial<MockApiKey> = {}): MockApiKey => ({
  id: overrides.id ?? randomUUID(),
  keyHash: overrides.keyHash ?? apiKeyHash(TEST_API_KEY),
  revoked: overrides.revoked ?? false,
  expiresAt: overrides.expiresAt ?? null,
  workspaceId: overrides.workspaceId ?? 'workspace-123',
});

export const createMockPrisma = (users: MockUser[], apiKeys: MockApiKey[]) => {
  return {
    user: {
      async findUnique({ where: { id, email } }: any) {
        if (id) return users.find((u) => u.id === id) ?? null;
        if (email) return users.find((u) => u.email === email) ?? null;
        return null;
      },
      async create({ data }: any) {
        users.push(data);
        return data;
      },
      async findFirst({ where: { email, password } }: any) {
        return users.find((u) => u.email === email && u.password === password) ?? null;
      },
    },
    apiKey: {
      async findFirst({ where }: any) {
        return (
          apiKeys.find(
            (key) =>
              key.keyHash === where.keyHash &&
              (where.revoked === undefined || key.revoked === where.revoked) &&
              (where.OR?.some((cond: any) =>
                cond.expiresAt === null ? key.expiresAt === null : key.expiresAt && key.expiresAt > new Date(),
              ) ?? true),
          ) ?? null
        );
      },
      async findMany() {
        return apiKeys;
      },
    },
  };
};

export const createMockRedisRateLimiter = () => {
  const attempts = new Map<string, number>();
  return {
    reset() {
      attempts.clear();
    },
    hit(key: string) {
      const next = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, next);
      return next;
    },
  };
};

export const buildErrorBody = () => ({ ok: false, code: 'AUTH_401', message: 'Unauthorized' });
