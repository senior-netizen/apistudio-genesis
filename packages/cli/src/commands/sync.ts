import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../core/config.js';
import { sendRequest } from '../core/httpClient.js';

export function registerSyncCommands(program: Command): void {
  const sync = program.command('sync').description('Synchronise collections and environments with the cloud workspace');

  sync
    .command('push')
    .description('Push local collections and environments to the cloud')
    .action(async () => {
      const config = await loadConfig();
      const response = await sendRequest({ method: 'POST', path: '/cli/sync', body: { config } });
      if (response.status >= 400) {
        console.log(chalk.red(`Sync push failed: ${response.status}`));
        return;
      }
      console.log(chalk.green('Workspace synced successfully.'));
    });

  sync
    .command('pull')
    .description('Pull workspace state from the cloud and update local cache')
    .action(async () => {
      const response = await sendRequest({ method: 'GET', path: '/cli/sync' });
      if (response.status >= 400) {
        console.log(chalk.red(`Sync pull failed: ${response.status}`));
        return;
      }
      try {
        const remote = JSON.parse(response.bodyText);
        await saveConfig(remote.config);
        console.log(chalk.green('Workspace updated from cloud.'));
      } catch (error) {
        console.log(chalk.red('Unable to parse remote sync payload.'));
      }
    });

  sync
    .command('diff')
    .description('Show differences between local and remote workspace state')
    .action(async () => {
      const [local, remoteResponse] = await Promise.all([loadConfig(), sendRequest({ method: 'GET', path: '/cli/sync' })]);
      if (remoteResponse.status >= 400) {
        console.log(chalk.red(`Sync diff failed: ${remoteResponse.status}`));
        return;
      }
      let remoteConfig: any;
      try {
        remoteConfig = JSON.parse(remoteResponse.bodyText).config;
      } catch {
        console.log(chalk.red('Failed to parse remote response.'));
        return;
      }

      const differences = diffObjects(local, remoteConfig);
      if (differences.length === 0) {
        console.log(chalk.green('Local workspace is up-to-date.'));
        return;
      }
      differences.forEach((line) => console.log(line));
    });
}

function diffObjects(local: any, remote: any, prefix = ''): string[] {
  const lines: string[] = [];
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  for (const key of keys) {
    const localValue = local?.[key];
    const remoteValue = remote?.[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      lines.push(...diffObjects(localValue, remoteValue, path));
    } else if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
      lines.push(`• ${path}: local=${JSON.stringify(localValue)} remote=${JSON.stringify(remoteValue)}`);
    }
  }
  return lines;
}
