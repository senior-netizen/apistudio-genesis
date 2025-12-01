import { Command } from 'commander';
import { CacheService } from '@squirrel/cache';
import { createSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';

export const registerCacheCommands = (program: Command): void => {
  program
    .command('cache:clear')
    .argument('[pattern]', 'Optional wildcard or prefix to clear (defaults to squirrel:*)')
    .description('Clear Redis-backed cache safely without touching system keys')
    .action(async (pattern?: string) => {
      const spinner = createSpinner('Clearing cache entries...');
      try {
        const cache = await CacheService.create();
        const removed = await cache.clearPattern(pattern);
        spinner.stop();
        logger.success(`Removed ${removed} cache entr${removed === 1 ? 'y' : 'ies'}.`);
      } catch (error) {
        spinner.fail('Failed to clear cache.');
        logger.handleError(error as Error);
        process.exitCode = 1;
      }
    });
};
