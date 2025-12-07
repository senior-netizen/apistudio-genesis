import { DEFAULT_GOVERNANCE_CONFIG } from './config';
import { LegalHoldService } from './legalHoldService';
import { RetentionService } from './service';
import type {
  AuditLogger,
  BackupRecord,
  BackupRepository,
  BackupStorage,
  GovernanceConfig,
  LegalHoldRepository,
  RetentionPolicyRepository,
  WorkspaceRepository,
} from './types';

export class BackupManager {
  private readonly retentionService: RetentionService;
  private readonly legalHoldService: LegalHoldService;
  private readonly backupRepo: BackupRepository;
  private readonly workspaceRepo: WorkspaceRepository;
  private readonly storage: BackupStorage;
  private readonly logger: AuditLogger;
  private readonly config: GovernanceConfig;

  constructor(options: {
    retentionRepo: RetentionPolicyRepository;
    legalHoldRepo: LegalHoldRepository;
    backupRepo: BackupRepository;
    workspaceRepo: WorkspaceRepository;
    storage: BackupStorage;
    logger: AuditLogger;
    config?: GovernanceConfig;
  }) {
    this.retentionService = new RetentionService({ retentionRepo: options.retentionRepo, config: options.config });
    this.legalHoldService = new LegalHoldService(options.legalHoldRepo);
    this.backupRepo = options.backupRepo;
    this.workspaceRepo = options.workspaceRepo;
    this.storage = options.storage;
    this.logger = options.logger;
    this.config = options.config ?? DEFAULT_GOVERNANCE_CONFIG;
  }

  async createWorkspaceSnapshot(
    workspaceId: string,
    options?: { reason?: string; initiatedBy?: string },
  ): Promise<BackupRecord> {
    if (!this.config.backups.enabled) {
      throw new Error('Backups are disabled by configuration');
    }
    const workspace = await this.workspaceRepo.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const upload = await this.storage.upload({
      workspaceId,
      organizationId: workspace.organizationId,
      regionCode: workspace.regionCode,
      reason: options?.reason,
    });

    const legalHoldActive = await this.legalHoldService.hasActiveHoldForWorkspace(workspaceId);
    const snapshot: BackupRecord = {
      id: `backup-${Date.now()}`,
      organizationId: workspace.organizationId,
      workspaceId,
      regionCode: workspace.regionCode,
      type: 'workspace_snapshot',
      snapshotTime: new Date(),
      storageLocation: upload.location,
      sizeBytes: upload.sizeBytes,
      createdBy: options?.initiatedBy ?? 'system',
      status: 'completed',
      metadata: { reason: options?.reason },
      isLegalHoldProtected: legalHoldActive,
    };

    const created = await this.backupRepo.create(snapshot);
    this.logger.log('backup.snapshot_created', {
      workspaceId,
      organizationId: workspace.organizationId,
      backupId: created.id,
      regionCode: workspace.regionCode,
    });
    return created;
  }

  async runBackupRetentionSweep(currentDate = new Date()): Promise<BackupRecord[]> {
    const backups = await this.backupRepo.listAll();
    const processed: BackupRecord[] = [];
    for (const backup of backups) {
      const ageMs = currentDate.getTime() - backup.snapshotTime.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const effectivePolicy = backup.workspaceId
        ? await this.retentionService.getEffectivePolicyForWorkspace(backup.workspaceId)
        : await this.retentionService.getEffectivePolicyForOrganization(backup.organizationId);

      const legalHoldActive = backup.workspaceId
        ? await this.legalHoldService.hasActiveHoldForWorkspace(backup.workspaceId)
        : await this.legalHoldService.hasActiveHoldForOrganization(backup.organizationId);

      if (legalHoldActive || backup.isLegalHoldProtected) {
        this.logger.log('legal_hold.prevented_deletion', {
          backupId: backup.id,
          workspaceId: backup.workspaceId,
          organizationId: backup.organizationId,
        });
        processed.push(backup);
        continue;
      }

      if (ageDays > effectivePolicy.retentionDays && effectivePolicy.includeBackups) {
        if (this.storage.deleteObject) {
          await this.storage.deleteObject(backup.storageLocation);
        }
        await this.backupRepo.updateStatus(backup.id, 'deleted');
        this.logger.log('backup.retention_enforced', {
          backupId: backup.id,
          workspaceId: backup.workspaceId,
          organizationId: backup.organizationId,
        });
        processed.push({ ...backup, status: 'deleted' });
      } else if (ageDays > effectivePolicy.retentionDays) {
        this.logger.log('backup.expired', {
          backupId: backup.id,
          workspaceId: backup.workspaceId,
          organizationId: backup.organizationId,
        });
        processed.push(backup);
      } else {
        processed.push(backup);
      }
    }
    return processed;
  }

  async restoreWorkspaceFromBackup(
    workspaceId: string,
    backupId: string,
    options?: { mode?: 'in-place' | 'new-workspace'; initiatedBy?: string },
  ): Promise<{ workspaceId: string; backupId: string }> {
    const backup = await this.backupRepo.findById(backupId);
    if (!backup) throw new Error('Backup not found');
    const workspace = await this.workspaceRepo.getWorkspaceById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    if (backup.regionCode !== workspace.regionCode) {
      throw new Error('Backup region does not match workspace region');
    }
    this.logger.log('backup.restore_started', {
      workspaceId,
      backupId,
      mode: options?.mode ?? 'in-place',
      initiatedBy: options?.initiatedBy ?? 'system',
    });

    try {
      // A real implementation would stream the artifact and hydrate resources.
      // Here we simulate by marking metadata.
      await this.backupRepo.updateStatus(backup.id, 'completed');
      this.logger.log('backup.restore_completed', {
        workspaceId,
        backupId,
        mode: options?.mode ?? 'in-place',
      });
      return { workspaceId, backupId };
    } catch (error) {
      this.logger.log('backup.restore_failed', {
        workspaceId,
        backupId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async softDeleteWorkspaceResource(params: {
    workspaceId: string;
    resourceId: string;
    resourceType: string;
  }): Promise<'soft-deleted' | 'blocked-by-legal-hold'> {
    const { workspaceId, resourceId, resourceType } = params;
    const legalHoldActive = await this.legalHoldService.hasActiveHoldForWorkspace(workspaceId);
    if (legalHoldActive) {
      this.logger.log('legal_hold.prevented_deletion', {
        workspaceId,
        resourceId,
        resourceType,
      });
      return 'blocked-by-legal-hold';
    }

    if (this.workspaceRepo.softDeleteWorkspaceResource) {
      await this.workspaceRepo.softDeleteWorkspaceResource({ workspaceId, resourceId, resourceType });
    }
    this.logger.log('backup.retention_enforced', { workspaceId, resourceId, resourceType });
    return 'soft-deleted';
  }
}
