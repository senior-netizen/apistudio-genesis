import { describe, it, expect, vi, beforeEach } from 'vitest';

const appendLine = vi.fn();
const getConfiguration = vi.fn();

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({ appendLine }),
  },
  workspace: {
    getConfiguration,
  },
}));

const post = vi.fn();
vi.mock('axios', () => ({
  default: { post },
}));

describe('cloudSync production controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips sync when required config is missing', async () => {
    getConfiguration.mockReturnValue({
      get: (key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'cloudSync.enable': true,
          'cloudSync.endpoint': '',
          'cloudSync.token': '',
          'cloudSync.workspaceId': 'ws_1',
          'cloudSync.timeoutMs': 8000,
          'cloudSync.retries': 1,
          'cloudSync.dryRun': false,
          'cloudSync.telemetryEnabled': true,
          'cloudSync.maxConsecutiveFailures': 2,
          'cloudSync.cooldownMs': 10,
        };
        return values[key] ?? fallback;
      },
    });

    const { syncProjectsToCloud } = await import('./cloudSync');
    const ok = await syncProjectsToCloud([]);

    expect(ok).toBe(false);
    expect(post).not.toHaveBeenCalled();
    expect(appendLine).toHaveBeenCalled();
  });

  it('supports dry-run mode for rollout safety', async () => {
    getConfiguration.mockReturnValue({
      get: (key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'cloudSync.enable': true,
          'cloudSync.endpoint': 'https://cloud.squirrel.dev',
          'cloudSync.token': 'token',
          'cloudSync.workspaceId': 'ws_1',
          'cloudSync.timeoutMs': 300,
          'cloudSync.retries': 2,
          'cloudSync.dryRun': true,
          'cloudSync.telemetryEnabled': true,
          'cloudSync.maxConsecutiveFailures': 2,
          'cloudSync.cooldownMs': 10,
        };
        return values[key] ?? fallback;
      },
    });

    const { syncProjectsToCloud } = await import('./cloudSync');
    const ok = await syncProjectsToCloud([]);

    expect(ok).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it('retries then succeeds when cloud endpoint is transiently failing', async () => {
    getConfiguration.mockReturnValue({
      get: (key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'cloudSync.enable': true,
          'cloudSync.endpoint': 'https://cloud.squirrel.dev',
          'cloudSync.token': 'token',
          'cloudSync.workspaceId': 'ws_1',
          'cloudSync.timeoutMs': 300,
          'cloudSync.retries': 2,
          'cloudSync.dryRun': false,
          'cloudSync.telemetryEnabled': true,
          'cloudSync.maxConsecutiveFailures': 2,
          'cloudSync.cooldownMs': 10,
        };
        return values[key] ?? fallback;
      },
    });

    post.mockRejectedValueOnce(new Error('network'));
    post.mockResolvedValueOnce({ status: 200 });

    const { uploadAnalyticsSnapshot } = await import('./cloudSync');
    const ok = await uploadAnalyticsSnapshot({
      total: 1,
      successes: 1,
      failures: 0,
      averageLatency: 10,
      favorites: 0,
    });

    expect(ok).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
  });
});
