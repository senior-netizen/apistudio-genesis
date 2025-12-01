import { Injectable, LoggerService, Scope } from '@nestjs/common';
import type { LogLevel } from '@nestjs/common/services/logger.service';
import type { Logger as PinoLogger } from 'pino';
import { createLogger } from '@squirrel/observability';

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private readonly logger = createLogger({ serviceName: 'squirrel-backend' });

  get raw(): PinoLogger {
    return this.logger;
  }

  forContext(context: string): PinoLogger {
    return this.logger.child({ context });
  }

  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }

  setLogLevels(_levels: LogLevel[]) {
    // Log levels are driven by pino; this hook exists for framework compatibility.
  }
}
