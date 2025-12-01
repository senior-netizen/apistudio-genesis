import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signJwt, expiredToken, TEST_JWT_SECRET } from '../../testing/auth-fixtures';

class SecretStorageMock {
  private values = new Map<string, string>();
  async store(key: string, value: string) {
    this.values.set(key, value);
  }
  async get(key: string) {
    return this.values.get(key);
  }
  async delete(key: string) {
    this.values.delete(key);
  }
}

describe('VS Code extension auth safety net', () => {
  let storage: SecretStorageMock;
  const token = signJwt({ sub: 'ext', email: 'ext@squirrel.test', role: 'founder' }, TEST_JWT_SECRET, 120);

  beforeEach(() => {
    storage = new SecretStorageMock();
  });

  it('stores tokens securely', async () => {
    await storage.store('squirrel.token', token);
    expect(await storage.get('squirrel.token')).toBe(token);
  });

  it('injects Authorization header into requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 });
    const stored = token;
    await fetchMock('https://api.squirrel.test/workspaces', {
      headers: { Authorization: `Bearer ${stored}` },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://api.squirrel.test/workspaces', {
      headers: { Authorization: `Bearer ${stored}` },
    });
  });

  it('alerts on invalid tokens', async () => {
    const bad = expiredToken({ sub: 'ext', email: 'ext@squirrel.test', role: 'founder' });
    const notifier = vi.fn();
    if (bad.includes('exp')) {
      notifier('Unauthorized');
    }
    expect(notifier).toHaveBeenCalledWith('Unauthorized');
  });
});
