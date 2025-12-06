import { InMemoryAuditLogService } from './audit-log.service';

describe('InMemoryAuditLogService', () => {
  it('records entries and paginates results', async () => {
    const service = new InMemoryAuditLogService();
    await service.record({
      userId: 'user-1',
      workspaceId: 'ws-1',
      effectiveRole: 'admin',
      requiredRole: 'viewer',
      rbacAllowed: true,
      timestamp: new Date('2023-01-01').toISOString(),
      action: 'test.action',
    });
    await service.record({
      userId: 'user-2',
      workspaceId: 'ws-1',
      effectiveRole: 'viewer',
      requiredRole: 'admin',
      rbacAllowed: false,
      timestamp: new Date('2023-01-02').toISOString(),
      action: 'test.action.denied',
    });

    const firstPage = await service.list({ workspaceId: 'ws-1', page: 1, pageSize: 1 });
    expect(firstPage).toHaveLength(1);

    const batch = await service.exportBatch(2, 0);
    expect(batch.records).toHaveLength(2);
    expect(batch.nextCursor).toBeUndefined();
  });
});
