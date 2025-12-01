import { Command } from 'commander';
import chalk from 'chalk';
import { sendRequest } from '../core/httpClient.js';
import { loadConfig } from '../core/config.js';
import { printResponse } from '../utils/printer.js';
import { generateRunInsights } from '../services/ai.js';
import { evaluateStatusExpectation, parseExpectation, Expectation } from '../utils/expectation.js';

interface TestOptions {
  repeat?: number;
  timeout?: number;
  expect?: string[];
  env?: string;
  ai?: boolean;
  concurrency?: number;
}

export function registerTestCommands(program: Command): void {
  program
    .command('test')
    .argument('<target>', 'Collection name or endpoint path')
    .description('Run request-based tests with optional retries and AI analysis')
    .option('--repeat <count>', 'Number of times to run the test', (value) => Number(value), 1)
    .option('--timeout <ms>', 'Abort if a single request exceeds the timeout in ms', (value) => Number(value), 10000)
    .option('--concurrency <count>', 'How many requests to run at once', (value) => Number(value), 1)
    .option('--expect <expect...>', 'Assertions such as status=200')
    .option('--env <env>', 'Override environment for this execution')
    .option('--ai', 'Generate AI-based optimisation tips')
    .action(async (target: string, options: TestOptions) => {
      if (target.endsWith('.collection')) {
        await runCollectionTest(target, options);
      } else {
        await runEndpointTest(target, options);
      }
    });
}

function parseExpectations(rules: string[] | undefined): Expectation[] {
  return (rules ?? [])
    .map((rule) => parseExpectation(rule))
    .filter((value): value is Expectation => Boolean(value));
}

function parsePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(value as number));
}

async function runWithConcurrency(tasks: Array<() => Promise<void>>, concurrency: number) {
  const queue = [...tasks];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        await task();
      }
    }
  });

  await Promise.all(workers);
}

function printSummary(
  label: string,
  durationMs: number,
  totalRuns: number,
  completedDurations: number[],
  failedRuns: number,
) {
  if (!totalRuns) {
    console.log(chalk.yellow('No requests were executed.'));
    return;
  }

  const successful = completedDurations.length;
  const avg = successful
    ? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length
    : 0;
  const fastest = successful ? Math.min(...completedDurations) : 0;
  const slowest = successful ? Math.max(...completedDurations) : 0;
  const rps = durationMs ? (totalRuns / (durationMs / 1000)).toFixed(2) : '∞';

  console.log(chalk.magenta(`\n${label} summary`));
  console.log(`  Total requests: ${totalRuns}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failedRuns}`);
  if (successful) {
    console.log(`  Avg latency: ${avg.toFixed(1)} ms`);
    console.log(`  Fastest: ${fastest} ms, slowest: ${slowest} ms`);
  }
  console.log(`  Throughput: ${rps} req/s`);
}

async function runCollectionTest(collection: string, options: TestOptions) {
  const config = await loadConfig();
  const definition = config.collections[collection];
  if (!definition) {
    console.log(chalk.red(`Collection "${collection}" not found.`));
    return;
  }
  const results: { request: any; status: number; duration: number }[] = [];
  const durations: number[] = [];
  let failedRuns = 0;
  const expectationRules = parseExpectations(options.expect);
  const repeat = parsePositiveInteger(options.repeat, 1);
  const concurrency = parsePositiveInteger(options.concurrency, 1);
  const started = Date.now();

  const tasks: Array<() => Promise<void>> = [];
  for (let i = 0; i < repeat; i += 1) {
    for (const request of definition.requests) {
      tasks.push(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeout ?? 10000);
        try {
          const response = await sendRequest({
            method: request.method,
            path: request.path,
            body: request.body,
            headers: request.headers,
            environmentName: options.env,
            signal: controller.signal,
          });
          clearTimeout(timeout);
          results.push({ request, status: response.status, duration: response.durationMs });
          durations.push(response.durationMs);
          printResponse(response.status, response.durationMs, request.method, request.path, response.bodyText, {
            pretty: true,
          });
          const failedExpectation = expectationRules.find((rule) => !evaluateStatusExpectation(response.status, rule));
          if (failedExpectation) {
            failedRuns += 1;
            console.log(chalk.red(`Expectation failed: status${failedExpectation.operator}${failedExpectation.value}`));
          }
        } catch (error) {
          failedRuns += 1;
          clearTimeout(timeout);
          console.log(chalk.red(`Test run failed: ${(error as Error).message}`));
        }
      });
    }
  }

  await runWithConcurrency(tasks, concurrency);
  const totalDuration = Date.now() - started;
  printSummary(`Collection ${collection}`, totalDuration, tasks.length, durations, failedRuns);

  if (options.ai) {
    const hints = await generateRunInsights(collection, results);
    console.log(chalk.cyan('\nAI Optimisation Suggestions:'));
    hints.forEach((hint) => console.log(`  • ${hint}`));
  }
}

async function runEndpointTest(path: string, options: TestOptions) {
  const results: { status: number; duration: number }[] = [];
  const expectationRules = parseExpectations(options.expect);
  const repeat = parsePositiveInteger(options.repeat, 1);
  const concurrency = parsePositiveInteger(options.concurrency, 1);
  const durations: number[] = [];
  let failedRuns = 0;
  const started = Date.now();

  const tasks: Array<() => Promise<void>> = [];
  for (let i = 0; i < repeat; i += 1) {
    tasks.push(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout ?? 10000);
      try {
        const response = await sendRequest({ method: 'GET', path, environmentName: options.env, signal: controller.signal });
        clearTimeout(timeout);
        results.push({ status: response.status, duration: response.durationMs });
        durations.push(response.durationMs);
        printResponse(response.status, response.durationMs, 'GET', path, response.bodyText, { pretty: true });
        const failedExpectation = expectationRules.find((rule) => !evaluateStatusExpectation(response.status, rule));
        if (failedExpectation) {
          failedRuns += 1;
          console.log(chalk.red(`Expectation failed: status${failedExpectation.operator}${failedExpectation.value}`));
        }
      } catch (error) {
        failedRuns += 1;
        clearTimeout(timeout);
        console.log(chalk.red(`Test failed: ${(error as Error).message}`));
      }
    });
  }

  await runWithConcurrency(tasks, concurrency);
  const totalDuration = Date.now() - started;
  printSummary(`Endpoint ${path}`, totalDuration, tasks.length, durations, failedRuns);

  if (options.ai) {
    const hints = await generateRunInsights('ad-hoc-test', results.map((result, index) => ({
      request: { name: `Run #${index + 1}`, method: 'GET', path },
      status: result.status,
      duration: result.duration,
    })));
    console.log(chalk.cyan('\nAI Optimisation Suggestions:'));
    hints.forEach((hint) => console.log(`  • ${hint}`));
  }
}
