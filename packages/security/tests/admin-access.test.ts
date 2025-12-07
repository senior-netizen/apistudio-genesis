import type { Request, Response, NextFunction } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { createAdminAccessMiddleware, type AdminActor, type AdminAccessAuditEntry } from '../src/admin-access';

type MockResponse = Response & { statusCode: number; body: unknown };

function createMockResponse(): MockResponse {
  const res: Partial<MockResponse> = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    json(payload: unknown) {
      this.body = payload;
      return this as Response;
    },
  };

  return res as MockResponse;
}

function createRequest(partial: Partial<Request> = {}): Request {
  return {
    originalUrl: '/admin/test',
    ip: '127.0.0.1',
    ...partial,
  } as Request;
}

function createActor(overrides: Partial<AdminActor> = {}): AdminActor {
  return {
    id: 'actor-1',
    role: 'admin',
    mfaEnabled: true,
    lastAuthenticatedAt: Date.now(),
    deviceTrusted: true,
    jitElevated: true,
    ...overrides,
  };
}

describe('createAdminAccessMiddleware', () => {
  it('denies when actor is missing', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const middleware = createAdminAccessMiddleware({
      getActor: () => null,
      auditSink: (entry) => auditEntries.push(entry),
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'authentication_required' });
    expect(next).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({ outcome: 'denied', reason: 'missing-actor' });
  });

  it('denies when role is insufficient', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const middleware = createAdminAccessMiddleware({
      getActor: () => createActor({ role: 'viewer' }),
      auditSink: (entry) => auditEntries.push(entry),
      minimumRole: 'admin',
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'admin_access_required' });
    expect(next).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({ outcome: 'denied', reason: 'insufficient-role' });
  });

  it('denies when MFA is not enabled', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const middleware = createAdminAccessMiddleware({
      getActor: () => createActor({ mfaEnabled: false }),
      auditSink: (entry) => auditEntries.push(entry),
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'mfa_required' });
    expect(next).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({ outcome: 'denied', reason: 'mfa_required' });
  });

  it('denies when recent authentication window is exceeded', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const middleware = createAdminAccessMiddleware({
      getActor: () => createActor({ lastAuthenticatedAt: Date.now() - 1000 * 60 * 60 }),
      auditSink: (entry) => auditEntries.push(entry),
      recentAuthWindowMs: 1000,
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'reauthentication_required' });
    expect(next).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({ outcome: 'denied', reason: 'reauthentication_required' });
  });

  it('denies when JIT elevation is required but missing', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const middleware = createAdminAccessMiddleware({
      getActor: () => createActor({ jitElevated: false }),
      auditSink: (entry) => auditEntries.push(entry),
      requireJitForDestructive: () => true,
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'jit_elevation_required' });
    expect(next).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({ outcome: 'denied', reason: 'jit_elevation_required' });
  });

  it('denies untrusted devices', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const middleware = createAdminAccessMiddleware({
      getActor: () => createActor({ deviceTrusted: false }),
      auditSink: (entry) => auditEntries.push(entry),
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'device_trust_required' });
    expect(next).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({ outcome: 'denied', reason: 'untrusted_device' });
  });

  it('denies when policy check fails', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const policyCheck = vi.fn().mockResolvedValue(false);
    const middleware = createAdminAccessMiddleware({
      getActor: () => createActor(),
      auditSink: (entry) => auditEntries.push(entry),
      policyCheck,
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(policyCheck).toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'policy_denied' });
    expect(next).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({ outcome: 'denied', reason: 'policy_denied' });
  });

  it('allows when all controls pass and records audit', async () => {
    const auditEntries: AdminAccessAuditEntry[] = [];
    const middleware = createAdminAccessMiddleware({
      getActor: () => createActor(),
      auditSink: (entry) => auditEntries.push(entry),
      policyCheck: () => true,
    });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, void>();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(auditEntries[auditEntries.length - 1]).toMatchObject({ outcome: 'allowed' });
  });
});
