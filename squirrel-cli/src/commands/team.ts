import { Command } from 'commander';
import {
  cancelInvitation,
  inviteTeamMember,
  listInvitations,
  listTeamMembers,
  removeMember,
  updateMemberRole,
  WorkspaceRole
} from '../api/teams';
import { getActiveProfile, loadConfig } from '../config/config';
import { logger } from '../utils/logger';
import { renderTable } from '../utils/table';
import { createSpinner } from '../utils/spinner';
import { maybePrintJsonError, maybePrintJsonSuccess } from '../utils/output';
import { maybePrintJson } from '../utils/output';

const parseRole = (role?: string): WorkspaceRole => {
  const normalized = (role ?? 'EDITOR').toUpperCase();
  const allowed: WorkspaceRole[] = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'];
  if (!allowed.includes(normalized as WorkspaceRole)) {
    throw new Error(`Invalid role "${role}". Use one of: ${allowed.join(', ')}`);
  }
  return normalized as WorkspaceRole;
};

const resolveWorkspaceId = async (explicit?: string): Promise<string | null> => {
  const config = await loadConfig();
  const profile = getActiveProfile(config);
  return explicit ?? profile.activeWorkspaceId ?? null;
};

export const registerTeamCommands = (program: Command): void => {
  const team = program.command('team').description('Administer team members for a workspace');

  team
    .command('list')
    .description('List members in the active or specified workspace')
    .option('-w, --workspace <id>', 'Workspace ID to inspect (defaults to active workspace)')
    .option('--include-invites', 'Show pending invitations in addition to active members')
    .option('--json', 'Return JSON output for automation')
    .action(async (options: { workspace?: string; includeInvites?: boolean; json?: boolean }) => {
      const workspaceId = await resolveWorkspaceId(options.workspace);
      if (!workspaceId) {
        if (maybePrintJsonError(options.json, 'workspace_required', 'No workspace specified.')) {
          process.exitCode = 1;
        if (maybePrintJson(options.json, { error: 'workspace_required' })) {
          return;
        }
        logger.warn('No workspace specified. Run `squirrel workspace use <id>` or pass --workspace.');
        return;
      }

      const spinner = createSpinner('Fetching team roster...');
      try {
        const [members, invites] = await Promise.all([
          listTeamMembers(workspaceId),
          options.includeInvites ? listInvitations(workspaceId) : Promise.resolve([])
        ]);
        spinner.stop();
        if (maybePrintJsonSuccess(options.json, { workspaceId, members, invites })) {
        if (maybePrintJson(options.json, { workspaceId, members, invites })) {
          return;
        }
        if (!members.length) {
          logger.warn('No active members found.');
        } else {
          renderTable(
            ['ID', 'Email', 'Role', 'Joined', 'Last active'],
            members.map((member) => [
              member.id,
              member.email,
              member.role,
              member.joinedAt ?? '-',
              member.lastActiveAt ?? '-'
            ])
          );
        }

        if (options.includeInvites) {
          if (!invites.length) {
            logger.info('\nNo pending invitations.');
          } else {
            console.log('\nPending invitations:');
            renderTable(
              ['ID', 'Email', 'Role', 'Expires'],
              invites.map((invite) => [invite.id, invite.email, invite.role, invite.expiresAt ?? '-'])
            );
          }
        }
      } catch (error) {
        spinner.fail('Unable to load team members.');
        if (maybePrintJsonError(options.json, 'team_list_failed', 'Unable to load team members.', error instanceof Error ? error.message : String(error))) {
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  team
    .command('invite <email>')
    .description('Invite a new collaborator to the workspace')
    .option('-r, --role <role>', 'Role to grant (OWNER, ADMIN, EDITOR, VIEWER)', 'editor')
    .option('-w, --workspace <id>', 'Workspace ID to invite into (defaults to active workspace)')
    .option('--json', 'Return JSON output for automation')
    .action(async (email: string, options: { role?: string; workspace?: string; json?: boolean }) => {
      const workspaceId = await resolveWorkspaceId(options.workspace);
      if (!workspaceId) {
        if (maybePrintJsonError(options.json, 'workspace_required', 'No workspace specified.')) {
          process.exitCode = 1;
        if (maybePrintJson(options.json, { error: 'workspace_required' })) {
          return;
        }
        logger.warn('No workspace specified. Run `squirrel workspace use <id>` or pass --workspace.');
        return;
      }
      const role = parseRole(options.role);
      const spinner = createSpinner(`Sending invite to ${email}...`);
      try {
        const invite = await inviteTeamMember(workspaceId, email, role);
        if (maybePrintJsonSuccess(options.json, { workspaceId, invite })) {
        if (maybePrintJson(options.json, { workspaceId, invite })) {
          spinner.stop();
          return;
        }
        spinner.succeed(`Invitation queued for ${invite.email} (${invite.role}).`);
      } catch (error) {
        spinner.fail('Failed to send invitation.');
        if (maybePrintJsonError(options.json, 'team_invite_failed', 'Failed to send invitation.', error instanceof Error ? error.message : String(error))) {
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  team
    .command('role <memberId> <role>')
    .description('Update the role for an existing member')
    .option('-w, --workspace <id>', 'Workspace ID (defaults to active workspace)')
    .option('--json', 'Return JSON output for automation')
    .action(async (memberId: string, role: string, options: { workspace?: string; json?: boolean }) => {
      const workspaceId = await resolveWorkspaceId(options.workspace);
      if (!workspaceId) {
        if (maybePrintJsonError(options.json, 'workspace_required', 'No workspace specified.')) {
          process.exitCode = 1;
        if (maybePrintJson(options.json, { error: 'workspace_required' })) {
          return;
        }
        logger.warn('No workspace specified.');
        return;
      }
      const parsedRole = parseRole(role);
      const spinner = createSpinner('Updating role...');
      try {
        const updated = await updateMemberRole(workspaceId, memberId, parsedRole);
        if (maybePrintJsonSuccess(options.json, { workspaceId, member: updated })) {
        if (maybePrintJson(options.json, { workspaceId, member: updated })) {
          spinner.stop();
          return;
        }
        spinner.succeed(`Member ${updated.email} is now ${updated.role}.`);
      } catch (error) {
        spinner.fail('Failed to update role.');
        if (maybePrintJsonError(options.json, 'team_role_failed', 'Failed to update role.', error instanceof Error ? error.message : String(error))) {
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  team
    .command('remove <memberOrInviteId>')
    .description('Remove a member or cancel a pending invitation')
    .option('-w, --workspace <id>', 'Workspace ID (defaults to active workspace)')
    .option('--invite', 'Treat the identifier as an invitation ID')
    .option('--json', 'Return JSON output for automation')
    .action(
      async (memberOrInviteId: string, options: { workspace?: string; invite?: boolean; json?: boolean }) => {
        const workspaceId = await resolveWorkspaceId(options.workspace);
        if (!workspaceId) {
          if (maybePrintJsonError(options.json, 'workspace_required', 'No workspace specified.')) {
            process.exitCode = 1;
          if (maybePrintJson(options.json, { error: 'workspace_required' })) {
            return;
          }
          logger.warn('No workspace specified.');
          return;
        }
        const spinner = createSpinner(options.invite ? 'Canceling invitation...' : 'Removing member...');
        try {
          if (options.invite) {
            await cancelInvitation(workspaceId, memberOrInviteId);
          } else {
            await removeMember(workspaceId, memberOrInviteId);
          }
          if (maybePrintJsonSuccess(options.json, { workspaceId, id: memberOrInviteId, invite: Boolean(options.invite), removed: true })) {
          if (maybePrintJson(options.json, { workspaceId, id: memberOrInviteId, invite: Boolean(options.invite), removed: true })) {
            spinner.stop();
            return;
          }
          spinner.succeed(options.invite ? 'Invitation canceled.' : 'Member removed.');
        } catch (error) {
          spinner.fail('Unable to remove entry.');
          if (maybePrintJsonError(options.json, 'team_remove_failed', 'Unable to remove entry.', error instanceof Error ? error.message : String(error))) {
            process.exitCode = 1;
            return;
          }
          throw error;
        }
      }
    );
};
