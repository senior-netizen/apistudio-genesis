import { describe, it, expect, vi, beforeEach } from 'vitest';

const appendLine = vi.fn();
const getConfiguration = vi.fn();

vi.mock('vscode', () => ({
  env: { machineId: 'machine-1' },
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

describe('squirrelAI production controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses remote AI output when endpoint and key are configured', async () => {
    getConfiguration.mockReturnValue({
      get: (key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'ai.endpoint': 'https://ai.squirrel.dev',
          'ai.apiKey': 'secret',
          'ai.model': 'squirrel-general-v1',
          'ai.timeoutMs': 4000,
          'ai.fallbackEnabled': true,
          'ai.remoteEnabled': true,
          'ai.remoteRolloutPercentage': 100,
          'ai.telemetryEnabled': true,
        };
        return values[key] ?? fallback;
      },
    });
    post.mockResolvedValue({ data: { output: 'Remote answer' } });

    const { runAiCommand } = await import('./squirrelAI');
    const result = await runAiCommand('analyzeResponse', { summary: 'ok' });

    expect(result).toBe('Remote answer');
    expect(post).toHaveBeenCalledOnce();
  });

  it('skips remote by rollout controls and uses fallback', async () => {
    getConfiguration.mockReturnValue({
      get: (key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'ai.endpoint': 'https://ai.squirrel.dev',
          'ai.apiKey': 'secret',
          'ai.model': 'squirrel-general-v1',
          'ai.timeoutMs': 4000,
          'ai.fallbackEnabled': true,
          'ai.remoteEnabled': true,
          'ai.remoteRolloutPercentage': 0,
          'ai.telemetryEnabled': true,
        };
        return values[key] ?? fallback;
      },
    });

    const { runAiCommand } = await import('./squirrelAI');
    const result = await runAiCommand('suggestFix', { summary: '401' });

    expect(result).toContain('Try refining request headers');
    expect(post).not.toHaveBeenCalled();
    expect(appendLine).toHaveBeenCalled();
  });

  it('returns explicit production message when fallback is disabled and remote fails', async () => {
    getConfiguration.mockReturnValue({
      get: (key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'ai.endpoint': 'https://ai.squirrel.dev',
          'ai.apiKey': 'secret',
          'ai.model': 'squirrel-general-v1',
          'ai.timeoutMs': 4000,
          'ai.fallbackEnabled': false,
          'ai.remoteEnabled': true,
          'ai.remoteRolloutPercentage': 100,
          'ai.telemetryEnabled': true,
        };
        return values[key] ?? fallback;
      },
    });
    post.mockRejectedValue(new Error('timeout'));

    const { runAiCommand } = await import('./squirrelAI');
    const result = await runAiCommand('suggestFix', { summary: '401' });

    expect(result).toContain('fallback is disabled');
    expect(appendLine).toHaveBeenCalled();
  });
});
