import type { LegalHold, LegalHoldRepository } from './types';

export class LegalHoldService {
  constructor(private readonly repo: LegalHoldRepository) {}

  async hasActiveHoldForWorkspace(workspaceId: string): Promise<boolean> {
    const holds = await this.repo.findActiveByWorkspaceId(workspaceId);
    return holds.some((hold) => hold.status === 'active');
  }

  async hasActiveHoldForOrganization(organizationId: string): Promise<boolean> {
    const holds = await this.repo.findActiveByOrganizationId(organizationId);
    return holds.some((hold) => hold.status === 'active');
  }

  async getActiveHoldsForScope({
    workspaceId,
    organizationId,
  }: {
    workspaceId?: string | null;
    organizationId?: string | null;
  }): Promise<LegalHold[]> {
    const workspaceHolds = workspaceId
      ? await this.repo.findActiveByWorkspaceId(workspaceId)
      : [];
    const orgHolds = organizationId
      ? await this.repo.findActiveByOrganizationId(organizationId)
      : [];
    return [...workspaceHolds, ...orgHolds].filter((hold) => hold.status === 'active');
  }
}
