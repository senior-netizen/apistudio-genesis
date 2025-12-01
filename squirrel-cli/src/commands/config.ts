import { Command } from 'commander';
import { getActiveProfile, getConfigPath, loadConfig, setActiveProfile, upsertProfile } from '../config/config';
import { createSpinner } from '../utils/spinner';

export const registerConfigCommands = (program: Command): void => {
  const configCommand = program.command('config').description('Manage CLI configuration');

  configCommand
    .command('path')
    .description('Show the configuration file path')
    .action(() => {
      console.log(getConfigPath());
    });

  const profile = configCommand.command('profile').description('Manage configuration profiles');

  profile
    .command('list')
    .description('List available profiles')
    .action(async () => {
      const config = await loadConfig();
      const active = config.activeProfile;
      Object.values(config.profiles).forEach((profileItem) => {
        const marker = profileItem.name === active ? '*' : ' ';
        console.log(`${marker} ${profileItem.name} (${profileItem.baseUrl})`);
      });
    });

  profile
    .command('use <profileName>')
    .description('Switch active profile')
    .action(async (profileName: string) => {
      const spinner = createSpinner(`Switching to profile ${profileName}...`);
      try {
        await setActiveProfile(profileName);
        spinner.succeed(`Profile ${profileName} is now active.`);
      } catch (error) {
        spinner.fail('Failed to switch profile.');
        throw error;
      }
    });

  profile
    .command('create <profileName>')
    .description('Create or update a profile')
    .option('-b, --base-url <baseUrl>', 'Gateway base URL')
    .action(async (profileName: string, options: { baseUrl?: string }) => {
      const config = await loadConfig();
      const current = getActiveProfile(config);
      const spinner = createSpinner('Saving profile...');
      try {
        await upsertProfile({
          name: profileName,
          baseUrl: options.baseUrl ?? current.baseUrl,
          accessToken: undefined
        });
        spinner.succeed(`Profile ${profileName} saved.`);
      } catch (error) {
        spinner.fail('Failed to save profile.');
        throw error;
      }
    });
};
