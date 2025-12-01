import { Command } from 'commander';
import { getQueueHealth } from '../api/queues';
import { createSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';

export const registerQueueCommands = (program: Command): void => {
  program
    .command('queues:stats')
    .description('Show BullMQ queue health and counts')
    .option('--json', 'Output raw JSON')
    .action(async (options: { json?: boolean }) => {
      const spinner = createSpinner('Fetching queue stats...');
      try {
        const health = await getQueueHealth();
        spinner.stop();
        if (options.json) {
          console.log(JSON.stringify(health, null, 2));
          return;
        }
        logger.info(
          `Status: ${health.status}\nQueues: ${health.queueCount}\nWaiting: ${health.jobCounts.waiting}\nActive: ${health.jobCounts.active}\nDelayed: ${health.jobCounts.delayed}\nCompleted: ${health.jobCounts.completed}\nFailed: ${health.jobCounts.failed}`,
        );
      } catch (error) {
        spinner.fail('Failed to fetch queue stats.');
        throw error;
      }
    });
};
