import { randomUUID } from 'node:crypto';
import { Command } from 'commander';
import chalk from 'chalk';
import { prompt } from '../utils/prompts.js';
import { ensureNonEmpty } from '../utils/validator.js';
import { loadConfig, saveConfig } from '../core/config.js';
import { storeSecret, deleteSecret, readSecret } from '../core/vault.js';
import { createSpinner } from '../utils/printer.js';
import { sendRequest } from '../core/httpClient.js';

interface LoginOptions {
  email?: string;
  apiKey?: string;
  token?: string;
  workspace?: string;
  validate?: boolean;
  env?: string;
}

export function registerAuthCommands(program: Command): void {
  program
    .command('login')
    .description('Authenticate with Squirrel API Studio')
    .option('--email <email>', 'Email address for your account')
    .option('--api-key <apiKey>', 'API key or personal access token')
    .option('--token <token>', 'Explicit access token to store in the vault')
    .option('--workspace <workspace>', 'Workspace slug to target')
    .option('--env <env>', 'Environment to use for validation requests')
    .option('--validate', 'Verify credentials against the active environment')
    .action(async (options: LoginOptions) => {
      const email = ensureNonEmpty(options.email ?? (await prompt('Email')), 'Email');
      const secret = options.apiKey ?? options.token ?? (await prompt('Access token', true));
      ensureNonEmpty(secret, 'Access token');

      const config = await loadConfig();
      const tokenId = `token-${randomUUID()}`;
      const spinner = createSpinner('Securing credentials');
      spinner.start();
      await storeSecret(tokenId, secret);
      spinner.succeed('Credentials stored securely');

      const userProfile = {
        email,
        workspace: options.workspace ?? config.user?.workspace,
        tokenId,
        lastLogin: new Date().toISOString(),
      };

      if (options.validate) {
        const validationSpinner = createSpinner('Validating session');
        validationSpinner.start();
        try {
          const response = await sendRequest({
            method: 'GET',
            path: '/cli/whoami',
            authToken: secret,
            environmentName: options.env,
          });
          validationSpinner.succeed('Session validated');
          console.log(chalk.green('Connected as'), email);
          console.log(chalk.gray(response.bodyText));
        } catch (error) {
          validationSpinner.fail('Validation failed');
          await deleteSecret(tokenId);
          throw error;
        }
      }

      await saveConfig({ ...config, user: userProfile });
      console.log(chalk.green(`Welcome back, ${email}!`));
    });

  program
    .command('whoami')
    .description('Display the current authenticated user')
    .action(async () => {
      const config = await loadConfig();
      if (!config.user) {
        console.log(chalk.yellow('You are not logged in. Run `squirrel login` to authenticate.'));
        return;
      }
      const tokenStatus = config.user.tokenId && (await readSecret(config.user.tokenId)) ? '✅ stored' : '⚠️ missing';
      console.log(chalk.cyan('Email:'), config.user.email);
      if (config.user.workspace) {
        console.log(chalk.cyan('Workspace:'), config.user.workspace);
      }
      console.log(chalk.cyan('Token:'), tokenStatus);
      if (config.user.lastLogin) {
        console.log(chalk.gray(`Last login: ${new Date(config.user.lastLogin).toLocaleString()}`));
      }
    });

  program
    .command('logout')
    .description('Remove local credentials and sign out')
    .action(async () => {
      const config = await loadConfig();
      if (config.user?.tokenId) {
        await deleteSecret(config.user.tokenId);
      }
      config.user = undefined;
      await saveConfig(config);
      console.log(chalk.green('Logged out and vault cleared.'));
    });
}
