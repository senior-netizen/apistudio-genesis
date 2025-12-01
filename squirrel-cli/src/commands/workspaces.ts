import { Command } from 'commander';
import { getWorkspace, listWorkspaces } from '../api/workspaces';
import { getActiveProfile, loadConfig, saveConfig } from '../config/config';
import { logger } from '../utils/logger';
import { renderTable } from '../utils/table';
import { createSpinner } from '../utils/spinner';

export const registerWorkspaceCommands = (program: Command): void => {
  const workspace = program.command('workspace').description('Manage workspaces');

  workspace
    .command('list')
    .description('List available workspaces')
    .action(async () => {
      const spinner = createSpinner('Loading workspaces...');
      try {
        const workspaces = await listWorkspaces();
        spinner.stop();
        if (!workspaces.length) {
          logger.warn('No workspaces found.');
          return;
        }
        renderTable(
          ['ID', 'Name', 'Slug', 'Role'],
          workspaces.map((ws) => [ws.id, ws.name, ws.slug ?? '-', ws.role ?? '-'])
        );
      } catch (error) {
        spinner.fail('Failed to fetch workspaces.');
        throw error;
      }
    });

  workspace
    .command('use <workspaceId>')
    .description('Set the active workspace')
    .action(async (workspaceId: string) => {
      const spinner = createSpinner('Switching workspace...');
      try {
        const ws = await getWorkspace(workspaceId);
        const config = await loadConfig();
        const profile = getActiveProfile(config);
        profile.activeWorkspaceId = ws.id;
        await saveConfig({ ...config, profiles: { ...config.profiles, [profile.name]: profile } });
        spinner.succeed(`Active workspace set to ${ws.name}`);
      } catch (error) {
        spinner.fail('Failed to set workspace.');
        throw error;
      }
    });
};
