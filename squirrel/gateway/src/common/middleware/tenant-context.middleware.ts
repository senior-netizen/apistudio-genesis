import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

type TenantAwareRequest = Request & {
  user?: Record<string, unknown>;
  tenantContext?: { orgId: string; workspaceId: string };
};

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly optionalPaths: RegExp[] = [
    /^\/health$/,
    /^\/docs(\/.*)?$/,
    /^\/api\/(v\d+\/)?auth\//,
    /^\/api\/(v\d+\/)?public\//,
    /^\/socket\.io\//,
  ];

  use(req: TenantAwareRequest, _res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const requestPath = req.path || req.url || '';
    const originalPath = req.originalUrl || requestPath;
    const isOptionalPath = this.optionalPaths.some(
      (pattern) => pattern.test(requestPath) || pattern.test(originalPath),
    );

    if (isOptionalPath) {
      return next();
    }

    const orgId = this.extractOrgClaim(req.user);
    const workspaceId = this.extractWorkspaceClaim(req.user);

    if (!orgId || !workspaceId) {
      throw new UnauthorizedException('Token missing required tenant claims (orgId/workspaceId)');
    }

    const requestedOrgId = this.readRequestTenantValue(req, ['orgId', 'organizationId'], ['x-org-id', 'x-organization-id']);
    const requestedWorkspaceId = this.readRequestTenantValue(req, ['workspaceId'], ['x-workspace-id']);

    if (requestedOrgId && requestedOrgId !== orgId) {
      throw new ForbiddenException('orgId in request does not match token claim');
    }

    if (requestedWorkspaceId && requestedWorkspaceId !== workspaceId) {
      throw new ForbiddenException('workspaceId in request does not match token claim');
    }

    req.headers['x-org-id'] = orgId;
    req.headers['x-organization-id'] = orgId;
    req.headers['x-workspace-id'] = workspaceId;
    req.tenantContext = { orgId, workspaceId };

    return next();
  }

  private extractOrgClaim(user?: Record<string, unknown>): string | undefined {
    return this.readString(
      user?.orgId,
      user?.organizationId,
      user?.org_id,
      user?.organization_id,
      user?.tenantOrgId,
    );
  }

  private extractWorkspaceClaim(user?: Record<string, unknown>): string | undefined {
    return this.readString(user?.workspaceId, user?.workspace_id, user?.tenantWorkspaceId);
  }

  private readRequestTenantValue(
    req: Request,
    fieldNames: string[],
    headerNames: string[],
  ): string | undefined {
    for (const headerName of headerNames) {
      const fromHeader = req.headers[headerName];
      if (fromHeader) {
        return Array.isArray(fromHeader) ? fromHeader[0] : String(fromHeader);
      }
    }

    for (const fieldName of fieldNames) {
      const paramValue = (req.params as Record<string, unknown> | undefined)?.[fieldName];
      const queryValue = (req.query as Record<string, unknown> | undefined)?.[fieldName];
      const bodyValue = (req.body as Record<string, unknown> | undefined)?.[fieldName];

      const normalized = this.readString(paramValue, queryValue, bodyValue);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private readString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    return undefined;
  }
}
