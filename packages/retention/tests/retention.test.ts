import { describe, expect, it, vi } from 'vitest';
import { BackupManager } from '../src/backupService';
import { DEFAULT_GOVERNANCE_CONFIG } from '../src/config';
import { LegalHoldService } from '../src/legalHoldService';
import { RetentionService } from '../src/service';
import type {
  BackupRecord,
  BackupRepository,
  LegalHold,
  LegalHoldRepository,
  RetentionPolicy,
  RetentionPolicyRepository,
  WorkspaceRepository,
} from '../src/types';

const retentionRepo: RetentionPolicyRepository = {
  findByWorkspaceId: async (workspaceId) =>
    workspaceId === 'org1:workspace-with-policy'
      ? {
          id: 'wp1',
          scopeId: workspaceId,
          scopeType: 'workspace',
          policyName: 'workspace policy',
          retentionDays: 30,
          keepSnapshots: true,
          includeAuditLogs: true,
          includeSecurityEvents: true,
          includeBackups: true,
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null,
  findByOrganizationId: async (organizationId) =>
    organizationId === 'org1'
      ? {
          id: 'org-policy',
          scopeId: organizationId,
          scopeType: 'organization',
          policyName: 'org policy',
          retentionDays: 60,
          keepSnapshots: true,
          includeAuditLogs: true,
          includeSecurityEvents: true,
          includeBackups: true,
          createdBy: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null,
};

const legalHoldRepo = (holds: LegalHold[]): LegalHoldRepository => ({
  findActiveByOrganizationId: async (organizationId) =>
    holds.filter((h) => h.organizationId === organizationId && h.status === 'active'),
  findActiveByWorkspaceId: async (workspaceId) =>
    holds.filter((h) => h.workspaceId === workspaceId && h.status === 'active'),
});

const workspaceRepo: WorkspaceRepository = {
  getWorkspaceById: async (workspaceId) =>
    workspaceId.startsWith('missing')
      ? null
      : { id: workspaceId, organizationId: workspaceId.split(':')[0], regionCode: 'us-east-1' },
};

const createBackupRepo = (initial: BackupRecord[] = []): BackupRepository => {
  const records = [...initial];
  return {
    create: async (backup) => {
      records.push(backup);
      return backup;
    },
    updateStatus: async (id, status) => {
      const idx = records.findIndex((b) => b.id === id);
      if (idx >= 0) records[idx] = { ...records[idx], status };
    },
    listAll: async () => [...records],
    findById: async (id) => records.find((b) => b.id === id) ?? null,
  };
};

const noopStorage = {
  upload: async () => ({ location: 's3://dummy/snapshot', sizeBytes: 1024 }),
  deleteObject: async () => {},
};

const logger = { log: vi.fn() };

const baselinePolicy: RetentionPolicy = {
  id: 'baseline',
  scopeId: 'org1',
  scopeType: 'organization',
  policyName: 'baseline',
  retentionDays: 10,
  keepSnapshots: true,
  includeAuditLogs: true,
  includeSecurityEvents: true,
  includeBackups: true,
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe('RetentionService', () => {
  it('prefers workspace policy over organization and default', async () => {
    const service = new RetentionService({ retentionRepo });
    const policy = await service.getEffectivePolicyForWorkspace('org1:workspace-with-policy');
    expect(policy.policyName).toBe('workspace policy');
  });

  it('falls back to organization policy when workspace is missing', async () => {
    const service = new RetentionService({ retentionRepo });
    const policy = await service.getEffectivePolicyForWorkspace('org1:workspace');
    expect(policy.policyName).toBe('org policy');
  });

  it('uses default when no policies exist', async () => {
    const service = new RetentionService({ retentionRepo });
    const policy = await service.getEffectivePolicyForWorkspace('org2:workspace');
    expect(policy.isDefault).toBe(true);
  });
});

describe('LegalHoldService', () => {
  it('detects active workspace hold', async () => {
    const service = new LegalHoldService(
      legalHoldRepo([
        {
          id: 'lh1',
          organizationId: 'org1',
          workspaceId: 'org1:ws1',
          reason: 'investigation',
          createdBy: 'cso',
          createdAt: new Date(),
          status: 'active',
          appliesTo: 'all',
        },
      ]),
    );
    expect(await service.hasActiveHoldForWorkspace('org1:ws1')).toBe(true);
    expect(await service.hasActiveHoldForOrganization('org1')).toBe(true);
  });

  it('ignores released holds', async () => {
    const service = new LegalHoldService(
      legalHoldRepo([
        {
          id: 'lh2',
          organizationId: 'org1',
          reason: 'closed',
          createdBy: 'cso',
          createdAt: new Date(),
          status: 'released',
          appliesTo: 'all',
        },
      ]),
    );
    expect(await service.hasActiveHoldForOrganization('org1')).toBe(false);
  });
});

describe('Backup retention sweep', () => {
  it('deletes backups older than retention when no legal hold is active', async () => {
    const backupRepo = createBackupRepo([
      {
        id: 'b1',
        organizationId: 'org1',
        workspaceId: 'org1:ws1',
        regionCode: 'us-east-1',
        type: 'workspace_snapshot',
        snapshotTime: daysAgo(15),
        storageLocation: 's3://old',
        createdBy: 'user',
        status: 'completed',
      },
    ]);
    const manager = new BackupManager({
      retentionRepo: {
        findByWorkspaceId: async () => baselinePolicy,
        findByOrganizationId: async () => baselinePolicy,
      },
      legalHoldRepo: legalHoldRepo([]),
      backupRepo,
      workspaceRepo,
      storage: noopStorage,
      logger,
      config: DEFAULT_GOVERNANCE_CONFIG,
    });

    const processed = await manager.runBackupRetentionSweep(new Date());
    expect(processed[0].status).toBe('deleted');
  });

  it('keeps backups under legal hold even when past retention', async () => {
    const backupRepo = createBackupRepo([
      {
        id: 'b2',
        organizationId: 'org1',
        workspaceId: 'org1:ws2',
        regionCode: 'us-east-1',
        type: 'workspace_snapshot',
        snapshotTime: daysAgo(20),
        storageLocation: 's3://hold',
        createdBy: 'user',
        status: 'completed',
      },
    ]);
    const manager = new BackupManager({
      retentionRepo: {
        findByWorkspaceId: async () => baselinePolicy,
        findByOrganizationId: async () => baselinePolicy,
      },
      legalHoldRepo: legalHoldRepo([
        {
          id: 'lh3',
          organizationId: 'org1',
          workspaceId: 'org1:ws2',
          reason: 'litigation',
          createdBy: 'cso',
          createdAt: new Date(),
          status: 'active',
          appliesTo: 'backups_only',
        },
      ]),
      backupRepo,
      workspaceRepo,
      storage: noopStorage,
      logger,
      config: DEFAULT_GOVERNANCE_CONFIG,
    });

    const processed = await manager.runBackupRetentionSweep(new Date());
    expect(processed[0].status).toBe('completed');
  });
});

describe('Snapshot and restore', () => {
  it('creates a snapshot and records metadata', async () => {
    const backupRepo = createBackupRepo();
    const manager = new BackupManager({
      retentionRepo,
      legalHoldRepo: legalHoldRepo([]),
      backupRepo,
      workspaceRepo,
      storage: noopStorage,
      logger,
      config: DEFAULT_GOVERNANCE_CONFIG,
    });

    const backup = await manager.createWorkspaceSnapshot('org1:ws3', {
      reason: 'manual',
      initiatedBy: 'owner',
    });

    expect(backup.workspaceId).toBe('org1:ws3');
    expect(backup.status).toBe('completed');
  });

  it('restores when regions match', async () => {
    const backupRepo = createBackupRepo([
      {
        id: 'restore-1',
        organizationId: 'org1',
        workspaceId: 'org1:ws4',
        regionCode: 'us-east-1',
        type: 'workspace_snapshot',
        snapshotTime: new Date(),
        storageLocation: 's3://restore',
        createdBy: 'user',
        status: 'completed',
      },
    ]);
    const manager = new BackupManager({
      retentionRepo,
      legalHoldRepo: legalHoldRepo([]),
      backupRepo,
      workspaceRepo,
      storage: noopStorage,
      logger,
      config: DEFAULT_GOVERNANCE_CONFIG,
    });

    const result = await manager.restoreWorkspaceFromBackup('org1:ws4', 'restore-1', {
      initiatedBy: 'founder',
      mode: 'in-place',
    });

    expect(result.backupId).toBe('restore-1');
  });
});

describe('Soft deletion with legal hold awareness', () => {
  it('blocks delete when legal hold is active', async () => {
    const backupRepo = createBackupRepo();
    const softDelete = vi.fn();
    const manager = new BackupManager({
      retentionRepo,
      legalHoldRepo: legalHoldRepo([
        {
          id: 'lh-soft',
          organizationId: 'org1',
          workspaceId: 'org1:ws5',
          reason: 'review',
          createdBy: 'cso',
          createdAt: new Date(),
          status: 'active',
          appliesTo: 'workspace_data',
        },
      ]),
      backupRepo,
      workspaceRepo: { ...workspaceRepo, softDeleteWorkspaceResource: softDelete },
      storage: noopStorage,
      logger,
      config: DEFAULT_GOVERNANCE_CONFIG,
    });

    const result = await manager.softDeleteWorkspaceResource({
      workspaceId: 'org1:ws5',
      resourceId: 'res1',
      resourceType: 'history',
    });

    expect(result).toBe('blocked-by-legal-hold');
    expect(softDelete).not.toHaveBeenCalled();
  });

  it('soft deletes when no legal hold is present', async () => {
    const softDelete = vi.fn();
    const backupRepo = createBackupRepo();
    const manager = new BackupManager({
      retentionRepo,
      legalHoldRepo: legalHoldRepo([]),
      backupRepo,
      workspaceRepo: { ...workspaceRepo, softDeleteWorkspaceResource: softDelete },
      storage: noopStorage,
      logger,
      config: DEFAULT_GOVERNANCE_CONFIG,
    });

    const result = await manager.softDeleteWorkspaceResource({
      workspaceId: 'org1:ws6',
      resourceId: 'res2',
      resourceType: 'history',
    });

    expect(result).toBe('soft-deleted');
    expect(softDelete).toHaveBeenCalled();
  });
});
