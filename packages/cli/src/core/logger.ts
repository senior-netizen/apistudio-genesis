import chalk from 'chalk';
import gradient from 'gradient-string';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  banner?: boolean;
}

export interface Logger {
  banner(): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string | Error, ...args: unknown[]): void;
}

const levelColors: Record<LogLevel, chalk.Chalk> = {
  debug: chalk.gray,
  info: chalk.cyan,
  warn: chalk.yellow,
  error: chalk.red,
};

const levelWeights: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export function createLogger(options: LoggerOptions = {}): Logger {
  const envDebug = Boolean(process.env.SQUIRREL_DEBUG);
  const resolvedLevel: LogLevel = options.level ?? (envDebug ? 'debug' : 'info');
  const showBanner = options.banner ?? (resolvedLevel !== 'warn' && resolvedLevel !== 'error');

  function isEnabled(level: LogLevel): boolean {
    return levelWeights[level] <= levelWeights[resolvedLevel];
  }

  function log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!isEnabled(level)) return;
    const color = levelColors[level];
    const label = color(`[${level.toUpperCase()}]`);
    console.log(label, message, ...args);
  }

  return {
    banner() {
      if (!showBanner) return;
      const title = 'Squirrel API Studio';
      const bannerOutput = gradient(['#00f5a0', '#00d9f5']).multiline(title);
      console.log(bannerOutput);
    },
    debug(message: string, ...args: unknown[]) {
      log('debug', message, ...args);
    },
    info(message: string, ...args: unknown[]) {
      log('info', message, ...args);
    },
    warn(message: string, ...args: unknown[]) {
      log('warn', message, ...args);
    },
    error(message: string | Error, ...args: unknown[]) {
      const text = message instanceof Error ? `${message.name}: ${message.message}` : message;
      log('error', text, ...args);
      if (message instanceof Error && (envDebug || resolvedLevel === 'debug')) {
        console.error(message.stack);
      }
    },
  };
}
