import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { loadConfig } from '../core/config.js';
import { sendRequest } from '../core/httpClient.js';
import { printResponse } from '../utils/printer.js';
import { CollectionRequest } from '../types/config.js';
import { evaluateStatusExpectation, parseExpectation } from '../utils/expectation.js';

interface RunOptions {
  env?: string;
  expect?: string[];
  table?: boolean;
  ai?: boolean;
}

export function registerCollectionCommands(program: Command): void {
  program
    .command('run')
    .argument('<collection>', 'Collection name or path to run')
    .description('Execute a stored request collection sequentially')
    .option('--env <env>', 'Override environment for this execution')
    .option('--expect <expect...>', 'Additional expectations, e.g. status=200')
    .option('--table', 'Display a summary table after execution')
    .option('--ai', 'Enable AI-driven hints (requires OPENAI_API_KEY)')
    .action(async (collectionName: string, options: RunOptions) => {
      const config = await loadConfig();
      const collection = config.collections[collectionName];
      if (!collection) {
        console.log(
          chalk.red(`Collection "${collectionName}" not found. Save a request with --save or create it manually.`)
        );
        return;
      }
      const results: { request: CollectionRequest; status: number; duration: number }[] = [];
      const expectations = options.expect ?? [];

      for (const request of collection.requests) {
        console.log(chalk.bold(`\n→ ${request.name}`));
        const response = await sendRequest({
          method: request.method,
          path: request.path,
          body: request.body,
          headers: request.headers,
          environmentName: options.env,
        });
        results.push({ request, status: response.status, duration: response.durationMs });
        printResponse(response.status, response.durationMs, request.method, request.path, response.bodyText, {
          pretty: true,
        });

        const failedExpectation = [...(request.expect ?? []), ...expectations].find((rule) => {
          const parsed = parseExpectation(rule);
          if (!parsed) return false;
          return !evaluateStatusExpectation(response.status, parsed);
        });
        if (failedExpectation) {
          console.log(chalk.red(`Expectation failed: ${failedExpectation}`));
        }
      }

      if (options.table) {
        const table = new Table({ head: ['Request', 'Status', 'Duration'] });
        results.forEach((result) => {
          const statusColor = result.status >= 200 && result.status < 300 ? chalk.green : chalk.red;
          table.push([
            result.request.name,
            statusColor(result.status),
            `${result.duration}ms`,
          ]);
        });
        console.log('\n' + table.toString());
      }

      if (options.ai) {
        const ai = await import('../services/ai.js');
        const hints = await ai.generateRunInsights(collectionName, results);
        console.log(chalk.cyan('\nAI Insights:'));
        hints.forEach((hint: string) => console.log(`  • ${hint}`));
      }
    });
}
