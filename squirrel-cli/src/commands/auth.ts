import { Command } from 'commander';
import { login as loginRequest, whoAmI } from '../api/auth';
import { clearActiveToken, getActiveProfile, loadConfig, upsertProfile } from '../config/config';
import { logger } from '../utils/logger';
import { loginPrompt } from '../utils/prompts';
import { createSpinner } from '../utils/spinner';
import { resetClient } from '../api/client';
import { clearCsrfToken, ensureCsrfToken, persistCsrfToken } from '../utils/csrf';

export const registerAuthCommands = (program: Command): void => {
  program
    .command('login')
    .description('Authenticate with the Squirrel API gateway')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .option('-b, --base-url <baseUrl>', 'Override base URL for the Squirrel gateway')
    .action(async (options: { email?: string; password?: string; baseUrl?: string }) => {
      const config = await loadConfig();
      const profile = getActiveProfile(config);

      let email = options.email;
      let password = options.password;
      if (!email || !password) {
        const answers = await loginPrompt();
        email = email ?? answers.email;
        password = password ?? answers.password;
      }

      if (options.baseUrl) {
        profile.baseUrl = options.baseUrl;
      }

      if (!email || !password) {
        throw new Error('Email and password are required for login.');
      }

      const spinner = createSpinner('Authenticating with Squirrel...');
      try {
        await ensureCsrfToken(true, profile.baseUrl);
        const response = await loginRequest(email, password);
        profile.accessToken = response.token;
        await upsertProfile(profile);
        if (response.csrfToken) {
          await persistCsrfToken(response.csrfToken);
        }
        resetClient();
        spinner.succeed('Logged in successfully.');
        logger.success(`Welcome ${response.user.name ?? response.user.email}!`);
      } catch (error) {
        spinner.fail('Login failed.');
        throw error;
      }
    });

  program
    .command('logout')
    .description('Clear authentication credentials')
    .action(async () => {
      const spinner = createSpinner('Clearing local session...');
      await clearActiveToken();
      await clearCsrfToken();
      resetClient();
      spinner.succeed('Logged out.');
    });

  program
    .command('whoami')
    .description('Display the currently authenticated user')
    .option('--json', 'Output raw JSON response')
    .action(async (options: { json?: boolean }) => {
      const spinner = createSpinner('Fetching user details...');
      try {
        const profile = getActiveProfile(await loadConfig());
        if (!profile.accessToken) {
          spinner.stop();
          logger.warn('Not logged in. Run `squirrel login`.');
          return;
        }
        const me = await whoAmI();
        spinner.stop();
        if (options.json) {
          console.log(JSON.stringify(me, null, 2));
          return;
        }
        logger.info(`User: ${me.name ?? 'Unknown'} <${me.email}>`);
        logger.info(`Roles: ${me.roles.join(', ') || 'none'}`);
        if (me.plan) {
          logger.info(`Plan: ${me.plan}`);
        }
      } catch (error) {
        spinner.fail('Failed to load user information.');
        throw error;
      }
    });
};
