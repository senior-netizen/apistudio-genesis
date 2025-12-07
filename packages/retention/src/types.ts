export type RetentionScopeType = 'organization' | 'workspace';

export interface RetentionPolicy {
  id: string;
  scopeType: RetentionScopeType;
  scopeId: string;
  policyName: string;
  description?: string;
  retentionDays: number;
  keepSnapshots: boolean;
  includeAuditLogs: boolean;
  includeSecurityEvents: boolean;
  includeBackups: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
  isLocked?: boolean;
}

export type BackupType = 'workspace_snapshot' | 'org_snapshot';
export type BackupStatus = 'completed' | 'in_progress' | 'failed' | 'expired' | 'deleted';

export interface BackupRecord {
  id: string;
  organizationId: string;
  workspaceId?: string | null;
  regionCode: string;
  type: BackupType;
  snapshotTime: Date;
  storageLocation: string;
  createdBy: string;
  sizeBytes?: number | null;
  status: BackupStatus;
  metadata?: Record<string, unknown>;
  isLegalHoldProtected?: boolean;
}

export type LegalHoldStatus = 'active' | 'released';

export interface LegalHold {
  id: string;
  organizationId: string;
  workspaceId?: string | null;
  reason: string;
  createdBy: string;
  createdAt: Date;
  status: LegalHoldStatus;
  appliesTo: 'all' | 'backups_only' | 'audit_logs_only' | 'workspace_data';
  releasedAt?: Date;
}

export interface GovernanceConfig {
  backups: {
    enabled: boolean;
    defaultRetentionDays: number;
    maxRetentionDays: number;
    allowWorkspaceLevelRetentionOverride: boolean;
  };
  legalHold: {
    enabled: boolean;
    requireReason: boolean;
    restrictToRoles: string[];
  };
  defaultKeepSnapshots?: boolean;
}

export interface WorkspaceSummary {
  id: string;
  organizationId: string;
  regionCode: string;
  deletedAt?: Date | null;
}

export interface AuditLogger {
  log: (event: string, payload: Record<string, unknown>) => void;
}

export interface BackupStorage {
  upload: (params: {
    workspaceId: string;
    organizationId: string;
    regionCode: string;
    reason?: string;
  }) => Promise<{ location: string; sizeBytes?: number }>;
  deleteObject?: (location: string) => Promise<void>;
}

export interface BackupRepository {
  create: (backup: BackupRecord) => Promise<BackupRecord> | BackupRecord;
  updateStatus: (id: string, status: BackupStatus) => Promise<void> | void;
  listAll: () => Promise<BackupRecord[]> | BackupRecord[];
  findById: (id: string) => Promise<BackupRecord | null> | BackupRecord | null;
}

export interface RetentionPolicyRepository {
  findByWorkspaceId: (workspaceId: string) => Promise<RetentionPolicy | null> | RetentionPolicy | null;
  findByOrganizationId: (organizationId: string) => Promise<RetentionPolicy | null> | RetentionPolicy | null;
}

export interface LegalHoldRepository {
  findActiveByWorkspaceId: (workspaceId: string) => Promise<LegalHold[]> | LegalHold[];
  findActiveByOrganizationId: (organizationId: string) => Promise<LegalHold[]> | LegalHold[];
}

export interface WorkspaceRepository {
  getWorkspaceById: (workspaceId: string) => Promise<WorkspaceSummary | null> | WorkspaceSummary | null;
  softDeleteWorkspaceResource?: (params: {
    workspaceId: string;
    resourceId: string;
    resourceType: string;
  }) => Promise<void> | void;
}
