import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { createRequestContextMiddleware } from '@squirrel/observability';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly delegate: (req: Request, res: Response, next: NextFunction) => void;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.delegate = createRequestContextMiddleware({
      serviceName: config.get<string>('app.otelServiceName', 'squirrel-backend'),
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.delegate(req, res, next);
  }
}
