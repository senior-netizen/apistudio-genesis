import { DEFAULT_GOVERNANCE_CONFIG } from './config';
import type { GovernanceConfig, RetentionPolicy, RetentionPolicyRepository } from './types';

export class RetentionService {
  private readonly retentionRepo: RetentionPolicyRepository;
  private readonly config: GovernanceConfig;

  constructor(options: { retentionRepo: RetentionPolicyRepository; config?: GovernanceConfig }) {
    this.retentionRepo = options.retentionRepo;
    this.config = options.config ?? DEFAULT_GOVERNANCE_CONFIG;
  }

  async getEffectivePolicyForWorkspace(workspaceId: string): Promise<RetentionPolicy> {
    const workspacePolicy = await this.retentionRepo.findByWorkspaceId(workspaceId);
    if (workspacePolicy) return workspacePolicy;

    const organizationId = workspaceId.split(':')[0];
    const orgPolicy = await this.retentionRepo.findByOrganizationId(organizationId);
    if (orgPolicy) return orgPolicy;

    return this.buildDefaultPolicy({ scopeId: workspaceId, scopeType: 'workspace' });
  }

  async getEffectivePolicyForOrganization(organizationId: string): Promise<RetentionPolicy> {
    const orgPolicy = await this.retentionRepo.findByOrganizationId(organizationId);
    if (orgPolicy) return orgPolicy;

    return this.buildDefaultPolicy({ scopeId: organizationId, scopeType: 'organization' });
  }

  private buildDefaultPolicy({
    scopeId,
    scopeType,
  }: {
    scopeId: string;
    scopeType: 'organization' | 'workspace';
  }): RetentionPolicy {
    return {
      id: `default-${scopeType}-${scopeId}`,
      scopeId,
      scopeType,
      policyName: 'Default retention',
      description: 'Global default retention policy',
      retentionDays: this.config.backups.defaultRetentionDays,
      keepSnapshots: this.config.defaultKeepSnapshots ?? true,
      includeAuditLogs: true,
      includeSecurityEvents: true,
      includeBackups: true,
      createdBy: 'system',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      isDefault: true,
      isLocked: true,
    };
  }
}
