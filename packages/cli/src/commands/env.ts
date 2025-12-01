import { Command } from 'commander';
import chalk from 'chalk';
import { ensureNonEmpty, ensureUrl } from '../utils/validator.js';
import { loadConfig, setCurrentEnvironment, upsertEnvironment, deleteEnvironment } from '../core/config.js';
import { parseKeyValuePairs } from '../utils/parser.js';

export function registerEnvCommands(program: Command): void {
  const env = program.command('env').description('Manage environments and variables');

  env
    .command('list')
    .description('List available environments')
    .action(async () => {
      const config = await loadConfig();
      const entries = Object.values(config.environments);
      if (entries.length === 0) {
        console.log(chalk.yellow('No environments configured. Run `squirrel env add <name> --url <baseUrl>` to add one.'));
        return;
      }
      for (const entry of entries) {
        const isActive = config.currentEnvironment === entry.name;
        const label = isActive ? chalk.green(`* ${entry.name}`) : `  ${entry.name}`;
        console.log(label, chalk.gray(entry.url));
        if (entry.variables && Object.keys(entry.variables).length > 0) {
          console.log(chalk.gray('  Variables:'));
          Object.entries(entry.variables).forEach(([key, value]) => {
            console.log(`    ${chalk.cyan(key)}=${value}`);
          });
        }
      }
    });

  env
    .command('add <name>')
    .description('Add or update an environment')
    .option('--url <url>', 'Base URL for the environment')
    .option('--header <header...>', 'Default header key=value pairs', [])
    .option('--var <variable...>', 'Environment variable key=value pairs', [])
    .action(async (name: string, options: { url?: string; header?: string[]; var?: string[] }) => {
      const url = ensureUrl(ensureNonEmpty(options.url ?? '', 'URL'));
      const headers = parseKeyValuePairs(options.header);
      const variables = parseKeyValuePairs(options.var);
      await upsertEnvironment({ name, url, headers, variables });
      console.log(chalk.green(`Environment "${name}" saved.`));
    });

  env
    .command('use <name>')
    .description('Set the active environment')
    .action(async (name: string) => {
      await setCurrentEnvironment(name);
      console.log(chalk.green(`Environment switched to ${name}.`));
    });

  env
    .command('remove <name>')
    .description('Remove an environment')
    .action(async (name: string) => {
      await deleteEnvironment(name);
      console.log(chalk.green(`Environment "${name}" removed.`));
    });

  env
    .command('vars <name>')
    .description('Show variables for an environment')
    .action(async (name: string) => {
      const config = await loadConfig();
      const envConfig = config.environments[name];
      if (!envConfig) {
        console.log(chalk.red(`Environment "${name}" not found.`));
        return;
      }
      console.log(chalk.bold(name), chalk.gray(envConfig.url));
      Object.entries(envConfig.variables ?? {}).forEach(([key, value]) => {
        console.log(`  ${chalk.cyan(key)}=${value}`);
      });
    });
}
