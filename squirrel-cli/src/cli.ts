import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth';
import { registerWorkspaceCommands } from './commands/workspaces';
import { registerEnvCommands } from './commands/env';
import { registerRequestCommands } from './commands/request';
import { registerCollectionCommands } from './commands/collections';
import { registerAiCommands } from './commands/ai';
import { registerBillingCommands } from './commands/billing';
import { registerLogCommands } from './commands/logs';
import { registerConfigCommands } from './commands/config';
import { registerTeamCommands } from './commands/team';
import { registerQueueCommands } from './commands/queues';
import { registerCacheCommands } from './commands/cache';
import { loadConfig } from './config/config';
import { logger } from './utils/logger';

export const run = async (): Promise<void> => {
  const program = new Command();
  program
    .name('squirrel')
    .description('Squirrel API Studio developer CLI')
    .version('0.1.0');

  registerAuthCommands(program);
  registerWorkspaceCommands(program);
  registerEnvCommands(program);
  registerRequestCommands(program);
  registerCollectionCommands(program);
  registerAiCommands(program);
  registerBillingCommands(program);
  registerLogCommands(program);
  registerConfigCommands(program);
  registerTeamCommands(program);
  registerQueueCommands(program);
  registerCacheCommands(program);

  program.hook('preAction', async () => {
    await loadConfig();
  });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.handleError(error);
    process.exit(1);
  }
};
