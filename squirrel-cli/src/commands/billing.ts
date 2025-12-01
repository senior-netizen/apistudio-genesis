import { Command } from 'commander';
import { getPlan, getUsage } from '../api/billing';
import { logger } from '../utils/logger';
import { renderTable } from '../utils/table';
import { createSpinner } from '../utils/spinner';

export const registerBillingCommands = (program: Command): void => {
  const billing = program.command('billing').description('Inspect billing and usage information');

  billing
    .command('me')
    .description('Show your current plan details')
    .option('--json', 'Output raw JSON response')
    .action(async (options: { json?: boolean }) => {
      const spinner = createSpinner('Fetching billing plan...');
      try {
        const plan = await getPlan();
        spinner.stop();
        if (options.json) {
          console.log(JSON.stringify(plan, null, 2));
          return;
        }
        logger.info(`Plan: ${plan.plan}`);
        logger.info(`Status: ${plan.status}`);
        if (plan.renewsOn) {
          logger.info(`Renews on: ${plan.renewsOn}`);
        }
        if (plan.limits) {
          renderTable(
            ['Metric', 'Value'],
            Object.entries(plan.limits).map(([key, value]) => [key, String(value)])
          );
        }
      } catch (error) {
        spinner.fail('Failed to fetch billing plan.');
        throw error;
      }
    });

  billing
    .command('usage')
    .description('Show recent usage events')
    .option('--limit <number>', 'Limit number of events', (value) => parseInt(value, 10))
    .action(async (options: { limit?: number }) => {
      const spinner = createSpinner('Fetching usage...');
      try {
        const usage = await getUsage();
        spinner.stop();
        if (usage.remainingCredits !== undefined) {
          logger.info(`Remaining credits: ${usage.remainingCredits}`);
        }
        const events = options.limit ? usage.recentEvents.slice(0, options.limit) : usage.recentEvents;
        if (!events.length) {
          logger.warn('No usage events found.');
          return;
        }
        renderTable(
          ['When', 'Type', 'Description', 'Amount'],
          events.map((event) => [event.createdAt, event.type, event.description ?? '-', event.amount ?? '-'])
        );
      } catch (error) {
        spinner.fail('Failed to fetch usage.');
        throw error;
      }
    });
};
