import { Command } from 'commander';
import { getRecentLogs, getRequestLogs } from '../api/logs';
import { logger } from '../utils/logger';
import { renderTable } from '../utils/table';
import { createSpinner } from '../utils/spinner';

export const registerLogCommands = (program: Command): void => {
  const logs = program.command('logs').description('Inspect logs from the Squirrel platform');

  logs
    .command('recent')
    .description('Show recent logs')
    .option('-n, --limit <number>', 'Number of log entries', (value) => parseInt(value, 10), 20)
    .option('--json', 'Output raw JSON')
    .action(async (options: { limit: number; json?: boolean }) => {
      const spinner = createSpinner('Fetching recent logs...');
      try {
        const entries = await getRecentLogs(options.limit);
        spinner.stop();
        if (options.json) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }
        if (!entries.length) {
          logger.warn('No logs found.');
          return;
        }
        renderTable(
          ['Time', 'Level', 'Message', 'Request ID'],
          entries.map((entry) => [entry.timestamp, entry.level, entry.message, entry.requestId ?? '-'])
        );
      } catch (error) {
        spinner.fail('Failed to fetch logs.');
        throw error;
      }
    });

  logs
    .command('request <requestId>')
    .description('Show logs for a specific request')
    .option('--json', 'Output raw JSON')
    .action(async (requestId: string, options: { json?: boolean }) => {
      const spinner = createSpinner('Fetching request logs...');
      try {
        const entries = await getRequestLogs(requestId);
        spinner.stop();
        if (options.json) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }
        if (!entries.length) {
          logger.warn('No logs found for this request.');
          return;
        }
        renderTable(
          ['Time', 'Level', 'Message'],
          entries.map((entry) => [entry.timestamp, entry.level, entry.message])
        );
      } catch (error) {
        spinner.fail('Failed to fetch request logs.');
        throw error;
      }
    });
};
