import { Command } from 'commander';
import { getEnvironment, listEnvironments, updateEnvironmentVariable } from '../api/environments';
import { getActiveProfile, loadConfig, saveConfig } from '../config/config';
import { logger } from '../utils/logger';
import { renderTable } from '../utils/table';
import { createSpinner } from '../utils/spinner';

export const registerEnvCommands = (program: Command): void => {
  const env = program.command('env').description('Manage environments');

  env
    .command('list')
    .description('List environments for the active workspace')
    .action(async () => {
      const config = await loadConfig();
      const profile = getActiveProfile(config);
      if (!profile.activeWorkspaceId) {
        logger.warn('No active workspace set. Run `squirrel workspace list` and `squirrel workspace use <id>`.');
        return;
      }
      const spinner = createSpinner('Loading environments...');
      try {
        const environments = await listEnvironments(profile.activeWorkspaceId);
        spinner.stop();
        if (!environments.length) {
          logger.warn('No environments found.');
          return;
        }
        renderTable(
          ['ID', 'Name', 'Variables', 'Updated'],
          environments.map((envItem) => [
            envItem.id,
            envItem.name,
            envItem.variables?.length ?? 0,
            envItem.updatedAt ?? '-'
          ])
        );
      } catch (error) {
        spinner.fail('Failed to fetch environments.');
        throw error;
      }
    });

  env
    .command('use <environment>')
    .description('Set the active environment by name or ID')
    .action(async (environment: string) => {
      const config = await loadConfig();
      const profile = getActiveProfile(config);
      if (!profile.activeWorkspaceId) {
        logger.warn('No active workspace set.');
        return;
      }
      const spinner = createSpinner('Selecting environment...');
      try {
        const environments = await listEnvironments(profile.activeWorkspaceId);
        const match = environments.find((envItem) => envItem.id === environment || envItem.name === environment);
        if (!match) {
          spinner.fail('Environment not found.');
          return;
        }
        profile.activeEnvironmentId = match.id;
        await saveConfig({ ...config, profiles: { ...config.profiles, [profile.name]: profile } });
        spinner.succeed(`Active environment set to ${match.name}`);
      } catch (error) {
        spinner.fail('Failed to set environment.');
        throw error;
      }
    });

  env
    .command('set <key> <value>')
    .description('Update an environment variable in the active environment')
    .action(async (key: string, value: string) => {
      const config = await loadConfig();
      const profile = getActiveProfile(config);
      if (!profile.activeEnvironmentId) {
        logger.warn('No active environment selected.');
        return;
      }
      const spinner = createSpinner(`Updating ${key}...`);
      try {
        await updateEnvironmentVariable(profile.activeEnvironmentId, key, value);
        spinner.succeed(`Updated ${key}.`);
      } catch (error) {
        spinner.fail('Failed to update variable.');
        throw error;
      }
    });

  env
    .command('show')
    .description('Show variables for the active environment')
    .option('--json', 'Output raw JSON')
    .action(async (options: { json?: boolean }) => {
      const config = await loadConfig();
      const profile = getActiveProfile(config);
      if (!profile.activeEnvironmentId) {
        logger.warn('No active environment selected.');
        return;
      }
      const spinner = createSpinner('Fetching environment...');
      try {
        const envData = await getEnvironment(profile.activeEnvironmentId);
        spinner.stop();
        if (options.json) {
          console.log(JSON.stringify(envData, null, 2));
          return;
        }
        renderTable(
          ['Key', 'Value'],
          envData.variables.map((variable) => [variable.key, variable.value])
        );
      } catch (error) {
        spinner.fail('Failed to show environment.');
        throw error;
      }
    });
};
