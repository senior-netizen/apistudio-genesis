import pino, { stdTimeFunctions, type LoggerOptions, type Logger } from 'pino';
import { getRequestContext } from './context';

export interface LoggerConfig {
  serviceName: string;
  level?: LoggerOptions['level'];
}

export function createLogger(config: LoggerConfig): Logger {
  return pino({
    name: config.serviceName,
    level: config.level ?? (process.env.LOG_LEVEL as LoggerOptions['level']) ?? 'info',
    base: { service: config.serviceName, env: process.env.NODE_ENV ?? 'development' },
    timestamp: stdTimeFunctions.isoTime,
    mixin() {
      const context = getRequestContext();
      if (!context) return {};
      const { requestId, correlationId, orgId, workspaceId, actorId } = context;
      return { requestId, correlationId, orgId, workspaceId, actorId };
    },
    formatters: {
      level(label, number) {
        return { level: label, levelValue: number };
      },
    },
  });
}

export type StructuredLogger = Logger;
