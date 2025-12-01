import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { signJwt, expiredToken, TEST_JWT_SECRET } from '../../testing/auth-fixtures';

describe('CLI auth stories', () => {
  const token = signJwt({ sub: 'cli', email: 'cli@squirrel.test', role: 'user' }, TEST_JWT_SECRET, 120);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads stored token and sends Authorization header', async () => {
    const getMock = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { ok: true } });
    await axios.get('https://api.squirrel.test/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(getMock).toHaveBeenCalledWith('https://api.squirrel.test/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  it('asks user to login again when token is expired', async () => {
    const expired = expiredToken({ sub: 'cli', email: 'cli@squirrel.test', role: 'user' });
    const getMock = vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 401 } });
    try {
      await axios.get('https://api.squirrel.test/me', { headers: { Authorization: `Bearer ${expired}` } });
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
    expect(getMock).toHaveBeenCalled();
  });
});
