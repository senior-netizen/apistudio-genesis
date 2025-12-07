import { ElevationScopeType } from './types';

const ROLE_PRECEDENCE = [
  'founder',
  'org_owner',
  'org_admin',
  'org_security',
  'org_billing',
  'workspace_owner',
  'workspace_admin',
  'maintainer',
  'editor',
  'viewer',
];

const ROLE_PRIORITY_MAP = ROLE_PRECEDENCE.reduce<Record<string, number>>((acc, role, index) => {
  acc[role] = index;
  return acc;
}, {});

export function isHigherRole(candidate: string, reference: string): boolean {
  const candidatePriority = ROLE_PRIORITY_MAP[candidate];
  const referencePriority = ROLE_PRIORITY_MAP[reference];
  if (candidatePriority === undefined || referencePriority === undefined) return false;
  return candidatePriority < referencePriority;
}

export function canApproveElevation({
  approverRole,
  requesterCurrentRole,
  requestedRole,
  scopeType,
}: {
  approverRole: string;
  requesterCurrentRole: string;
  requestedRole: string;
  scopeType: ElevationScopeType;
}): boolean {
  const approverPriority = ROLE_PRIORITY_MAP[approverRole];
  const requesterPriority = ROLE_PRIORITY_MAP[requesterCurrentRole];
  const requestedPriority = ROLE_PRIORITY_MAP[requestedRole];

  if (approverPriority === undefined || requesterPriority === undefined || requestedPriority === undefined) {
    return false;
  }

  if (approverPriority >= requesterPriority) return false;

  // Founder can approve anything
  if (approverRole === 'founder') return true;

  if (approverRole === 'org_owner') {
    return requestedRole !== 'founder';
  }

  if (approverRole === 'org_admin') {
    if (requestedRole === 'org_owner' || requestedRole === 'founder' || requestedRole === 'org_admin') return false;
    if (requestedRole === 'org_security' || requestedRole === 'org_billing') return false;
    if (scopeType === 'workspace') return requestedPriority < ROLE_PRIORITY_MAP['org_admin'];
    return false;
  }

  if (approverRole === 'org_security') {
    return requestedRole === 'org_security' || requestedRole === 'org_admin';
  }

  if (approverRole === 'org_billing') {
    return requestedRole === 'org_billing';
  }

  if (approverRole === 'workspace_owner' || approverRole === 'workspace_admin') {
    if (scopeType !== 'workspace') return false;
    if (requesterCurrentRole === 'maintainer' && requestedRole === 'workspace_admin') return true;
    if (requesterCurrentRole === 'editor' && (requestedRole === 'maintainer' || requestedRole === 'workspace_admin'))
      return true;
    if (requesterCurrentRole === 'viewer' && ['editor', 'maintainer'].includes(requestedRole)) return true;
    return false;
  }

  return false;
}

export function getHigherRole(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a && !b) return null;
  if (a && !b) return a;
  if (!a && b) return b;

  const aPriority = a ? ROLE_PRIORITY_MAP[a] ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
  const bPriority = b ? ROLE_PRIORITY_MAP[b] ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;

  return aPriority < bPriority ? a! : b!;
}

export function defaultJitConfig() {
  return {
    enabled: true,
    maxDurationMinutes: 120,
    defaultDurations: [15, 30, 60],
    notifyApprovers: true,
  };
}
