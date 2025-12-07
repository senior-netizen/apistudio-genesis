import { GovernanceConfig } from './types';

export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  backups: {
    enabled: true,
    defaultRetentionDays: 365,
    maxRetentionDays: 3650,
    allowWorkspaceLevelRetentionOverride: true,
  },
  legalHold: {
    enabled: true,
    requireReason: true,
    restrictToRoles: ['founder', 'org_owner', 'org_security'],
  },
  defaultKeepSnapshots: true,
};
