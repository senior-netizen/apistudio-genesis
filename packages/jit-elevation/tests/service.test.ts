import { describe, expect, it, vi } from 'vitest';

import { InMemoryElevationRepository } from '../src/repository';
import { JitElevationService, effectiveRoleWithElevation } from '../src/service';

const setupService = (auditSpy = vi.fn()) => {
  const repo = new InMemoryElevationRepository();
  const service = new JitElevationService(repo, undefined, auditSpy, () => new Date('2024-01-01T00:00:00Z'));
  return { repo, service, auditSpy };
};

describe('JIT elevation service flows', () => {
  it('creates and approves a request', async () => {
    const { service, auditSpy } = setupService();

    const request = await service.requestElevation({
      requesterId: 'user-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      requestedRole: 'workspace_admin',
      scopeType: 'workspace',
      reason: 'Need admin',
      requestedDurationMinutes: 30,
      requesterCurrentRole: 'editor',
    });

    expect(request.status).toBe('pending');

    const approved = await service.approveElevation({
      requestId: request.id,
      approverId: 'user-2',
      approverRole: 'workspace_owner',
      approvedDurationMinutes: 25,
    });

    expect(approved.status).toBe('approved');
    expect(approved.effectiveFrom?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(approved.expiresAt?.toISOString()).toBe('2024-01-01T00:25:00.000Z');
    expect(auditSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid approvals', async () => {
    const { service } = setupService();

    const request = await service.requestElevation({
      requesterId: 'user-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      requestedRole: 'workspace_admin',
      scopeType: 'workspace',
      reason: 'Need admin',
      requestedDurationMinutes: 30,
      requesterCurrentRole: 'editor',
    });

    await expect(() =>
      service.approveElevation({
        requestId: request.id,
        approverId: 'user-2',
        approverRole: 'viewer',
        approvedDurationMinutes: 10,
      }),
    ).rejects.toThrow('Approver not authorized');
  });

  it('cancels pending requests', async () => {
    const { service } = setupService();
    const request = await service.requestElevation({
      requesterId: 'user-1',
      organizationId: 'org-1',
      requestedRole: 'org_admin',
      scopeType: 'organization',
      reason: 'Need help',
      requestedDurationMinutes: 45,
      requesterCurrentRole: 'org_member',
    });

    const cancelled = await service.cancelElevation({ requestId: request.id, requesterId: 'user-1' });
    expect(cancelled.status).toBe('cancelled');
  });
});

describe('active elevation resolution', () => {
  it('returns active elevation overlay and expires stale ones', async () => {
    const { service, repo } = setupService();

    const request = await service.requestElevation({
      requesterId: 'user-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      requestedRole: 'workspace_admin',
      scopeType: 'workspace',
      reason: 'Need admin',
      requestedDurationMinutes: 30,
      requesterCurrentRole: 'editor',
    });

    await service.approveElevation({
      requestId: request.id,
      approverId: 'user-2',
      approverRole: 'workspace_owner',
      approvedDurationMinutes: 15,
    });

    const active = await service.getActiveElevationForUser({ userId: 'user-1', organizationId: 'org-1', workspaceId: 'ws-1' });
    expect(active?.elevatedToRole).toBe('workspace_admin');

    // fast-forward clock by swapping clock implementation
    const lateService = new JitElevationService(repo, undefined, () => {}, () => new Date('2024-01-01T00:16:00Z'));
    await lateService.expireElevationsNow();
    const expired = await repo.findById(request.id);
    expect(expired?.status).toBe('expired');
  });
});

describe('effective role helper', () => {
  it('prefers elevated role when higher', () => {
    const elevatedRole = effectiveRoleWithElevation('editor', {
      requestId: 'req-1',
      userId: 'user-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      elevatedToRole: 'workspace_admin',
      effectiveFrom: new Date(),
      expiresAt: new Date(),
    });
    expect(elevatedRole).toBe('workspace_admin');
  });

  it('keeps base role when higher than elevation', () => {
    const elevatedRole = effectiveRoleWithElevation('org_owner', {
      requestId: 'req-1',
      userId: 'user-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      elevatedToRole: 'maintainer',
      effectiveFrom: new Date(),
      expiresAt: new Date(),
    });
    expect(elevatedRole).toBe('org_owner');
  });
});
