import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { signJwt, TEST_JWT_SECRET } from '../../testing/auth-fixtures';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length() {
    return this.store.size;
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage();
}

if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = new MemoryStorage();
}

if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = (data: string) => Buffer.from(data, 'base64').toString('binary');
}

export const ACCESS_TOKEN = signJwt({ sub: 'web-user', email: 'web@squirrel.test', role: 'owner' }, TEST_JWT_SECRET, 60);
export const REFRESH_TOKEN = signJwt(
  { sub: 'web-user', email: 'web@squirrel.test', role: 'owner', kind: 'refresh' },
  TEST_JWT_SECRET,
  120,
);

let lastAuth = '';

export const server = setupServer(
  rest.post('/auth/login', async (_req, res, ctx) => {
    lastAuth = '';
    return res(ctx.json({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN }));
  }),
  rest.get('/api/protected', async (req, res, ctx) => {
    lastAuth = req.headers.get('authorization') || '';
    if (!lastAuth) return res(ctx.status(401), ctx.json({ ok: false }));
    return res(ctx.json({ ok: true, role: 'owner' }));
  }),
  rest.post('/auth/refresh', async (req, res, ctx) => {
    const headers = req.headers.get('authorization');
    if (headers?.includes('bad-refresh')) {
      return res(ctx.status(401), ctx.json({ ok: false }));
    }
    return res(
      ctx.json({
        accessToken: signJwt({ sub: 'web-user', email: 'web@squirrel.test', role: 'owner' }, TEST_JWT_SECRET, 60),
        refreshToken: signJwt(
          { sub: 'web-user', email: 'web@squirrel.test', role: 'owner', kind: 'refresh' },
          TEST_JWT_SECRET,
          120,
        ),
      }),
    );
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => server.close());

export const getLastAuthHeader = () => lastAuth;
export const recordAuthHeader = (header: string) => {
  lastAuth = header;
};
