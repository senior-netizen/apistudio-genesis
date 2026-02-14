import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerWorkspaceCommands } from './workspaces';
import { JSON_SCHEMA_VERSION } from '../utils/output';
import { listWorkspaces } from '../api/workspaces';

vi.mock('../api/workspaces', () => ({
  listWorkspaces: vi.fn(),
  getWorkspace: vi.fn(),
}));

vi.mock('../utils/spinner', () => ({
  createSpinner: () => ({
    stop: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  }),
}));

const listWorkspacesMock = vi.mocked(listWorkspaces);

describe('workspace --json contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    listWorkspacesMock.mockReset();
    process.exitCode = 0;
  });

  afterEach(() => {
    process.exitCode = 0;
  });

  it('prints stable success envelope for workspace list', async () => {
    listWorkspacesMock.mockResolvedValue([
      { id: 'ws_1', name: 'Core', slug: 'core', role: 'OWNER' },
    ]);

    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const program = new Command();
    registerWorkspaceCommands(program);

    await program.parseAsync(['workspace', 'list', '--json'], { from: 'user' });

    const payload = JSON.parse(String(write.mock.calls[0][0]));
    expect(payload).toMatchObject({
      schemaVersion: JSON_SCHEMA_VERSION,
      ok: true,
      data: {
        workspaces: [
          { id: 'ws_1', name: 'Core', slug: 'core', role: 'OWNER' },
        ],
      },
    });
  });

  it('prints stable error envelope and sets non-zero exit for failures', async () => {
    listWorkspacesMock.mockRejectedValue(new Error('network unavailable'));

    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const program = new Command();
    registerWorkspaceCommands(program);

    await program.parseAsync(['workspace', 'list', '--json'], { from: 'user' });

    const payload = JSON.parse(String(write.mock.calls[0][0]));
    expect(payload).toMatchObject({
      schemaVersion: JSON_SCHEMA_VERSION,
      ok: false,
      error: {
        code: 'workspace_list_failed',
        message: 'Failed to fetch workspaces.',
        details: 'network unavailable',
      },
    });
    expect(process.exitCode).toBe(1);
  });
});
