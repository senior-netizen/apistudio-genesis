import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantContextMiddleware } from './tenant-context.middleware';

describe('TenantContextMiddleware', () => {
  const middleware = new TenantContextMiddleware();

  const baseReq = () =>
    ({
      method: 'GET',
      path: '/api/v1/workspaces',
      url: '/api/v1/workspaces',
      originalUrl: '/api/v1/workspaces',
      headers: {},
      params: {},
      query: {},
      body: {},
    }) as any;

  it('allows optional paths without tenant claims', () => {
    const req = baseReq();
    req.path = '/health';
    req.originalUrl = '/health';
    const next = jest.fn();

    middleware.use(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects protected paths when tenant claims are missing', () => {
    const req = baseReq();

    expect(() => middleware.use(req, {} as any, jest.fn())).toThrow(UnauthorizedException);
  });

  it('injects canonical tenant headers from token claims', () => {
    const req = baseReq();
    req.user = { orgId: 'org_123', workspaceId: 'ws_123' };
    const next = jest.fn();

    middleware.use(req, {} as any, next);

    expect(req.headers['x-org-id']).toBe('org_123');
    expect(req.headers['x-organization-id']).toBe('org_123');
    expect(req.headers['x-workspace-id']).toBe('ws_123');
    expect(req.tenantContext).toEqual({ orgId: 'org_123', workspaceId: 'ws_123' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects request when provided orgId does not match claim', () => {
    const req = baseReq();
    req.user = { orgId: 'org_123', workspaceId: 'ws_123' };
    req.headers['x-org-id'] = 'org_other';

    expect(() => middleware.use(req, {} as any, jest.fn())).toThrow(ForbiddenException);
  });

  it('rejects request when provided workspaceId does not match claim', () => {
    const req = baseReq();
    req.user = { orgId: 'org_123', workspaceId: 'ws_123' };
    req.query.workspaceId = 'ws_other';

    expect(() => middleware.use(req, {} as any, jest.fn())).toThrow(ForbiddenException);
  });
});
