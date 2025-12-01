import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { createRequestLoggingMiddleware } from '@squirrel/observability';
import { AppLogger } from '../infra/logger/app-logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly delegate: (req: Request, res: Response, next: NextFunction) => void;

  constructor(appLogger: AppLogger) {
    this.delegate = createRequestLoggingMiddleware({
      logger: appLogger.raw,
      ignorePaths: [/health/, /docs/],
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.delegate(req, res, next);
  }
}
