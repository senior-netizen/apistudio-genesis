import os from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { getConfigDir, loadConfig } from '../core/config.js';
import { CLI_VERSION } from '../core/version.js';

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) {
    return 'unknown';
  }

  const absSeconds = Math.max(1, Math.floor(diffMs / 1000));
  if (absSeconds < 60) {
    return `${absSeconds}s ago`;
  }
  const absMinutes = Math.floor(absSeconds / 60);
  if (absMinutes < 60) {
    return `${absMinutes}m ago`;
  }
  const absHours = Math.floor(absMinutes / 60);
  if (absHours < 24) {
    return `${absHours}h ago`;
  }
  const absDays = Math.floor(absHours / 24);
  if (absDays < 7) {
    return `${absDays}d ago`;
  }
  const absWeeks = Math.floor(absDays / 7);
  if (absWeeks < 4) {
    return `${absWeeks}w ago`;
  }
  const absMonths = Math.floor(absDays / 30);
  if (absMonths < 12) {
    return `${absMonths}mo ago`;
  }
  const absYears = Math.floor(absDays / 365);
  return `${absYears}y ago`;
}

interface StatusOptions {
  json?: boolean;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show diagnostic information about the CLI environment')
    .option('--json', 'Output machine-readable JSON')
    .action(async (options: StatusOptions) => {
      const config = await loadConfig();
      const currentEnvName = config.currentEnvironment;
      const currentEnv = currentEnvName ? config.environments[currentEnvName] : undefined;
      const lastRequest = config.recentRequests[0];
      const squirrelHome = process.env.SQUIRREL_HOME ?? path.join(os.homedir(), '.squirrel');

      const payload = {
        version: CLI_VERSION,
        squirrelHome,
        configPath: getConfigDir(),
        environments: {
          active: currentEnv ? { name: currentEnv.name, url: currentEnv.url } : undefined,
          total: Object.keys(config.environments).length,
        },
        collections: Object.keys(config.collections).length,
        user: config.user,
        lastRequest,
        recentRequests: config.recentRequests.length,
      };

      if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      console.log(`${chalk.bold('Squirrel CLI')} ${chalk.gray(`v${payload.version}`)}`);
      console.log(`${chalk.bold('Config:')} ${payload.configPath}`);
      console.log(`${chalk.bold('Home:')} ${payload.squirrelHome}`);

      if (payload.environments.total === 0) {
        console.log(chalk.yellow('No environments configured. Run `squirrel env add <name> --url <baseUrl>` to get started.'));
        console.log(`${chalk.bold('Environments:')} 0`);
      } else {
        if (payload.environments.active) {
          console.log(
            `${chalk.bold('Active Environment:')} ${chalk.green(payload.environments.active.name)} ${chalk.gray(payload.environments.active.url)}`
          );
        } else {
          console.log(chalk.yellow('No active environment selected. Run `squirrel env use <name>` to switch.'));
        }
        console.log(`${chalk.bold('Environments:')} ${payload.environments.total}`);
      }

      if (payload.user) {
        const workspaceSuffix = payload.user.workspace ? chalk.gray(` (workspace: ${payload.user.workspace})`) : '';
        console.log(`${chalk.bold('User:')} ${chalk.cyan(payload.user.email)}${workspaceSuffix}`);
      } else {
        console.log(chalk.yellow('No user authenticated. Run `squirrel login` to connect your account.'));
      }

      console.log(`${chalk.bold('Collections:')} ${payload.collections}`);
      console.log(`${chalk.bold('Recent Requests:')} ${payload.recentRequests}`);

      if (payload.lastRequest) {
        const savedAt = new Date(payload.lastRequest.savedAt);
        const whenText = Number.isNaN(savedAt.getTime()) ? 'at an unknown time' : formatRelativeTime(savedAt);
        const durationText = payload.lastRequest.durationMs !== undefined ? `${payload.lastRequest.durationMs}ms` : 'n/a';
        const statusText = payload.lastRequest.status
          ? `${payload.lastRequest.status} in ${durationText}`
          : 'pending';
        console.log(
          `${chalk.bold('Last Request:')} ${chalk.cyan(payload.lastRequest.method)} ${payload.lastRequest.url} ${chalk.gray(
            `${statusText} • ${whenText}`
          )}`
        );
      } else {
        console.log(chalk.gray('No requests have been made yet. Try `squirrel get /health`.'));
      }
    });
}
