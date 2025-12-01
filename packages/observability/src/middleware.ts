import type { NextFunction, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import type { StructuredLogger } from './logger';
import { getRequestContext } from './context';

export interface RequestLoggingOptions {
  logger: StructuredLogger;
  ignorePaths?: RegExp[];
}

export function createRequestLoggingMiddleware(options: RequestLoggingOptions) {
  const shouldSkip = (url: string) => options.ignorePaths?.some((regex) => regex.test(url));
  const httpLogger = pinoHttp({
    logger: options.logger,
    autoLogging: { ignore: (req: Request) => Boolean(req.url && shouldSkip(req.url)) },
    serializers: {
      req(req: Request) {
        const context = getRequestContext();
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          orgId: context?.orgId,
          workspaceId: context?.workspaceId,
        };
      },
    },
  });

  return function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
    httpLogger(req, res);
    res.on('finish', () => {
      const context = getRequestContext();
      options.logger.debug({
        statusCode: res.statusCode,
        responseTime: (res as any).responseTime || undefined,
        orgId: context?.orgId,
        workspaceId: context?.workspaceId,
      }, 'request completed');
    });
    next();
  };
}
