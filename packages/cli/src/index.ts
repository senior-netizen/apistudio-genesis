#!/usr/bin/env node
import { Command } from 'commander';
import { loadPlugins } from './plugins/loader.js';
import { registerAuthCommands } from './commands/auth.js';
import { registerEnvCommands } from './commands/env.js';
import { registerRequestCommands } from './commands/request.js';
import { registerCollectionCommands } from './commands/collection.js';
import { registerAiCommands } from './commands/ai.js';
import { registerMockCommands } from './commands/mock.js';
import { registerDocsCommands } from './commands/docs.js';
import { registerSyncCommands } from './commands/sync.js';
import { registerTestCommands } from './commands/test.js';
import { registerStatusCommand } from './commands/status.js';
import { registerHistoryCommands } from './commands/history.js';
import { bootstrapState } from './services/bootstrap.js';
import { createLogger, LogLevel } from './core/logger.js';
import { CLI_VERSION } from './core/version.js';

interface ResolvedLoggerOptions {
  level?: LogLevel;
  banner: boolean;
}

function resolveLoggerOptions(argv: string[]): ResolvedLoggerOptions {
  const level: LogLevel | undefined = argv.includes('--silent')
    ? 'error'
    : argv.includes('--quiet')
    ? 'warn'
    : argv.includes('--verbose')
    ? 'debug'
    : undefined;

  let banner = !argv.includes('--no-banner');
  if (level === 'warn' || level === 'error') {
    banner = false;
  }

  return { level, banner };
}

async function main() {
  const argv = process.argv.slice(2);
  const loggerOptions = resolveLoggerOptions(argv);
  const logger = createLogger(loggerOptions);
  await bootstrapState(logger);

  const program = new Command();
  program
    .name('squirrel')
    .description('Squirrel API Studio CLI — build, test, document, and automate APIs with ease')
    .version(CLI_VERSION)
    .option('--verbose', 'Enable verbose logging output')
    .option('--quiet', 'Only print warnings and errors')
    .option('--silent', 'Only print errors')
    .option('--no-banner', 'Skip the startup banner');

  registerAuthCommands(program);
  registerEnvCommands(program);
  registerRequestCommands(program);
  registerCollectionCommands(program);
  registerAiCommands(program);
  registerMockCommands(program);
  registerDocsCommands(program);
  registerSyncCommands(program);
  registerTestCommands(program);
  registerStatusCommand(program);
  registerHistoryCommands(program);

  await loadPlugins(program, logger);

  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
