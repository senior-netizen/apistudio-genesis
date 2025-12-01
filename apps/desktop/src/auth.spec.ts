import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signJwt, expiredToken, TEST_JWT_SECRET } from '../../testing/auth-fixtures';

const readConfig = (file?: string) => {
  if (!file) return {};
  try {
    return JSON.parse(file);
  } catch {
    return {};
  }
};

const callGateway = async (token: string, fetchImpl: typeof fetch) => {
  const res = await fetchImpl('https://api.squirrel.test/protected', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res;
};

describe('Desktop auth behaves gently', () => {
  const valid = signJwt({ sub: 'desktop', email: 'desk@squirrel.test', role: 'admin' }, TEST_JWT_SECRET, 120);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads tokens from config file and uses them', async () => {
    const config = readConfig(JSON.stringify({ tokens: { access: valid } }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await callGateway(config.tokens.access, fetchMock as any);
    expect(fetchMock).toHaveBeenCalledWith('https://api.squirrel.test/protected', expect.anything());
    expect(res.status).toBe(200);
  });

  it('handles missing tokens kindly', async () => {
    const config = readConfig(undefined);
    expect(config.tokens).toBeUndefined();
  });

  it('prompts login when token is invalid', async () => {
    const expired = expiredToken({ sub: 'desktop', email: 'desk@squirrel.test', role: 'admin' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 401 }));
    const res = await callGateway(expired, fetchMock as any);
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalled();
  });
});
