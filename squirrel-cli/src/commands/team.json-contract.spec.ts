import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerTeamCommands } from './team';
import { JSON_SCHEMA_VERSION } from '../utils/output';
import { loadConfig, getActiveProfile } from '../config/config';
import { listTeamMembers } from '../api/teams';

vi.mock('../config/config', () => ({
  loadConfig: vi.fn(),
  getActiveProfile: vi.fn(),
}));

vi.mock('../api/teams', () => ({
  listTeamMembers: vi.fn(),
  listInvitations: vi.fn(),
  inviteTeamMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  cancelInvitation: vi.fn(),
}));

vi.mock('../utils/spinner', () => ({
  createSpinner: () => ({
    stop: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  }),
}));

const loadConfigMock = vi.mocked(loadConfig);
const getActiveProfileMock = vi.mocked(getActiveProfile);
const listTeamMembersMock = vi.mocked(listTeamMembers);

describe('team --json contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    loadConfigMock.mockReset();
    getActiveProfileMock.mockReset();
    listTeamMembersMock.mockReset();
    process.exitCode = 0;
  });

  afterEach(() => {
    process.exitCode = 0;
  });

  it('prints workspace-required error envelope and exits non-zero when workspace is missing', async () => {
    loadConfigMock.mockResolvedValue({} as never);
    getActiveProfileMock.mockReturnValue({ activeWorkspaceId: null } as never);

    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const program = new Command();
    registerTeamCommands(program);

    await program.parseAsync(['team', 'remove', 'member_1', '--json'], { from: 'user' });

    const payload = JSON.parse(String(write.mock.calls[0][0]));
    expect(payload).toMatchObject({
      schemaVersion: JSON_SCHEMA_VERSION,
      ok: false,
      error: {
        code: 'workspace_required',
        message: 'No workspace specified.',
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('prints stable success envelope for team list', async () => {
    loadConfigMock.mockResolvedValue({} as never);
    getActiveProfileMock.mockReturnValue({ activeWorkspaceId: 'ws_1' } as never);
    listTeamMembersMock.mockResolvedValue([
      { id: 'm_1', email: 'owner@squirrel.dev', role: 'OWNER', joinedAt: null, lastActiveAt: null },
    ] as never);

    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const program = new Command();
    registerTeamCommands(program);

    await program.parseAsync(['team', 'list', '--json'], { from: 'user' });

    const payload = JSON.parse(String(write.mock.calls[0][0]));
    expect(payload).toMatchObject({
      schemaVersion: JSON_SCHEMA_VERSION,
      ok: true,
      data: {
        workspaceId: 'ws_1',
        members: [{ id: 'm_1', email: 'owner@squirrel.dev', role: 'OWNER' }],
        invites: [],
      },
    });
  });
});
