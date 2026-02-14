import { Command } from 'commander';
import { getWorkspace, listWorkspaces } from '../api/workspaces';
import { getActiveProfile, loadConfig, saveConfig } from '../config/config';
import { logger } from '../utils/logger';
import { renderTable } from '../utils/table';
import { createSpinner } from '../utils/spinner';
import { maybePrintJson } from '../utils/output';

export const registerWorkspaceCommands = (program: Command): void => {
  const workspace = program.command('workspace').description('Manage workspaces');

  workspace
    .command('list')
    .description('List available workspaces')
    .option('--json', 'Return JSON output for automation')
    .action(async (options: { json?: boolean }) => {
      const spinner = createSpinner('Loading workspaces...');
      try {
        const workspaces = await listWorkspaces();
        spinner.stop();
        if (maybePrintJson(options.json, { workspaces })) {
          return;
        }

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
    .option('--json', 'Return JSON output for automation')
    .action(async (workspaceId: string, options: { json?: boolean }) => {
      const spinner = createSpinner('Switching workspace...');
      try {
        const ws = await getWorkspace(workspaceId);
        const config = await loadConfig();
        const profile = getActiveProfile(config);
        profile.activeWorkspaceId = ws.id;
        await saveConfig({ ...config, profiles: { ...config.profiles, [profile.name]: profile } });
        if (maybePrintJson(options.json, { activeWorkspaceId: ws.id, workspace: ws })) {
          spinner.stop();
          return;
        }
        spinner.succeed(`Active workspace set to ${ws.name}`);
      } catch (error) {
        spinner.fail('Failed to set workspace.');
        throw error;
      }
    });
};
