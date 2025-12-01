export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrganizationMembership {
  organizationId?: string;
  id?: string;
  role: OrganizationRole;
}
