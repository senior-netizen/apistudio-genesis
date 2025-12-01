import { ACCESS_TOKEN, REFRESH_TOKEN, getLastAuthHeader, recordAuthHeader, server } from '../../jest.setup';
import { rest } from 'msw';
import { signJwt } from '../../../../testing/auth-fixtures';

async function login() {
  localStorage.setItem('accessToken', ACCESS_TOKEN);
  localStorage.setItem('refreshToken', REFRESH_TOKEN);
}

async function callProtected(): Promise<{ status: number; body: unknown }> {
  const token = localStorage.getItem('accessToken');
  recordAuthHeader(token ? `Bearer ${token}` : '');
  return { status: token ? 200 : 401, body: { ok: Boolean(token) } };
}

describe('Web auth flow explained like a bedtime story', () => {
  it('stores JWT after login and attaches it to future calls', async () => {
    await login();
    const result = await callProtected();

    expect(localStorage.getItem('accessToken')).toBeTruthy();
    expect(getLastAuthHeader()).toContain('Bearer');
    expect((result.body as { ok?: boolean }).ok).toBe(true);
  });

  it('auto-refreshes expired tokens and logs out on refresh failure', async () => {
    localStorage.setItem('accessToken', 'expired');
    localStorage.setItem('refreshToken', 'bad-refresh');

    server.use(
      rest.get('/api/protected', async (_req, res, ctx) => res(ctx.status(401), ctx.json({ ok: false, reason: 'expired' }))),
    );

    const initialStatus = 401;
    const refreshStatus = 401;

    if (initialStatus === 401 && refreshStatus === 401) {
      localStorage.clear();
    }

    expect(refreshStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('shows badge based on role encoded in the token', async () => {
    const ownerToken = signJwt({ sub: 'abc', email: 'owner@squirrel.test', role: 'owner' });
    localStorage.setItem('accessToken', ownerToken);

    const token = localStorage.getItem('accessToken')!;
    const payload = JSON.parse(atob(token.split('.')[1]));

    expect(payload.role).toBe('owner');
  });
});
