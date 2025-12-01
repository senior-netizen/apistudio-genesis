import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  orgId?: string;
  workspaceId?: string;
  actorId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export interface RequestContextOptions {
  serviceName?: string;
  defaultOrgHeader?: string;
  defaultWorkspaceHeader?: string;
}

export function createRequestContextMiddleware(options?: RequestContextOptions) {
  const orgHeader = options?.defaultOrgHeader ?? 'x-org-id';
  const workspaceHeader = options?.defaultWorkspaceHeader ?? 'x-workspace-id';

  return function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const correlationId = (req.headers['x-correlation-id'] as string) || requestId;
    const orgId = (req.headers[orgHeader] as string | undefined) ?? undefined;
    const workspaceId = (req.headers[workspaceHeader] as string | undefined) ?? undefined;
    const actorId = (req.headers['x-actor-id'] as string | undefined) ?? undefined;

    const context: RequestContext = { requestId, correlationId, orgId, workspaceId, actorId };

    runWithRequestContext(context, () => {
      res.setHeader('x-request-id', requestId);
      res.setHeader('x-correlation-id', correlationId);
      next();
    });
  };
}
