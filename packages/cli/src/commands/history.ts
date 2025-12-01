import chalk from 'chalk';
import { Command } from 'commander';
import { loadConfig, updateConfig } from '../core/config.js';
import { RecentRequestSnapshot } from '../types/config.js';

interface HistoryListOptions {
  limit?: string;
  method?: string;
  status?: string;
  json?: boolean;
}

function parseLimit(limit?: string): number {
  if (!limit) return 10;
  const parsed = Number.parseInt(limit, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('Limit must be a positive integer.');
  }
  return parsed;
}

function buildStatusPredicate(filter?: string): (status?: number) => boolean {
  if (!filter) {
    return () => true;
  }

  const normalized = filter.toLowerCase();
  const exact = Number.parseInt(normalized, 10);
  if (!Number.isNaN(exact)) {
    return (status) => status === exact;
  }

  if (/^\dxx$/.test(normalized)) {
    const bucket = Number.parseInt(normalized[0], 10);
    const floor = bucket * 100;
    return (status) => typeof status === 'number' && status >= floor && status < floor + 100;
  }

  const rangeMatch = normalized.match(/^(\d{3})-(\d{3})$/);
  if (rangeMatch) {
    const start = Number.parseInt(rangeMatch[1], 10);
    const end = Number.parseInt(rangeMatch[2], 10);
    if (start > end) {
      throw new Error('Status range start must be less than or equal to end.');
    }
    return (status) => typeof status === 'number' && status >= start && status <= end;
  }

  throw new Error('Status filter must be a number, range (200-204), or class (2xx).');
}

function formatStatus(status?: number): string {
  if (typeof status !== 'number') {
    return chalk.gray('---');
  }
  if (status >= 500) return chalk.red(status.toString());
  if (status >= 400) return chalk.yellow(status.toString());
  if (status >= 300) return chalk.blue(status.toString());
  if (status >= 200) return chalk.green(status.toString());
  return chalk.gray(status.toString());
}

function formatDuration(durationMs?: number): string {
  if (typeof durationMs !== 'number') return 'n/a';
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(2)}s`;
}

function formatAgo(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  const days = Math.round(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}

function filterHistory(entries: RecentRequestSnapshot[], options: HistoryListOptions): RecentRequestSnapshot[] {
  const limit = parseLimit(options.limit);
  const statusPredicate = buildStatusPredicate(options.status);
  const methodFilter = options.method?.toUpperCase();

  return entries
    .filter((entry) => {
      if (methodFilter && entry.method.toUpperCase() !== methodFilter) {
        return false;
      }
      if (!statusPredicate(entry.status)) {
        return false;
      }
      return true;
    })
    .slice(0, limit);
}

export function registerHistoryCommands(program: Command): void {
  const history = program.command('history').description('Inspect recent request history');

  history
    .command('list')
    .description('List the most recent requests made by the CLI')
    .option('--limit <number>', 'Maximum number of entries to display (default: 10)')
    .option('--method <method>', 'Filter by HTTP method (e.g. GET)')
    .option('--status <filter>', 'Filter by status code, range (200-204), or class (2xx)')
    .option('--json', 'Emit the results as JSON')
    .action(async (options: HistoryListOptions) => {
      const config = await loadConfig();
      if (config.recentRequests.length === 0) {
        console.log(chalk.gray('No request history recorded yet. Send a request with `squirrel get` to populate history.'));
        return;
      }

      let filtered: RecentRequestSnapshot[];
      try {
        filtered = filterHistory(config.recentRequests, options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(message));
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(filtered, null, 2));
        return;
      }

      filtered.forEach((entry) => {
        const status = formatStatus(entry.status);
        const duration = chalk.gray(formatDuration(entry.durationMs));
        const when = chalk.gray(formatAgo(entry.savedAt));
        console.log(`${chalk.cyan(entry.method.padEnd(6))} ${status} ${duration} ${entry.url} ${when}`);
      });
    });

  history
    .command('clear')
    .description('Clear the stored request history')
    .action(async () => {
      await updateConfig({ recentRequests: [] });
      console.log(chalk.green('Request history cleared.'));
    });
}
