import { Command } from 'commander';
import Redis from 'ioredis';
import { createSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';

const redisUrl = () => process.env.SQUIRREL_CACHE_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379';

const clearPattern = async (pattern = 'squirrel:*'): Promise<number> => {
  const redis = new Redis(redisUrl(), { lazyConnect: true, maxRetriesPerRequest: 2 });
  let cursor = '0';
  let removed = 0;

  try {
    await redis.connect();
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = nextCursor;
      if (keys.length > 0) {
        const batchRemoved = await redis.del(...keys);
        removed += batchRemoved;
      }
    } while (cursor !== '0');

    return removed;
  } finally {
    await redis.quit();
  }
};

export const registerCacheCommands = (program: Command): void => {
  program
    .command('cache:clear')
    .argument('[pattern]', 'Optional wildcard or prefix to clear (defaults to squirrel:*)')
    .description('Clear Redis-backed cache safely without touching system keys')
    .action(async (pattern?: string) => {
      const spinner = createSpinner('Clearing cache entries...');
      try {
        const removed = await clearPattern(pattern);
        spinner.stop();
        logger.success(`Removed ${removed} cache entr${removed === 1 ? 'y' : 'ies'}.`);
      } catch (error) {
        spinner.fail('Failed to clear cache.');
        logger.handleError(error as Error);
        process.exitCode = 1;
      }
    });
};
