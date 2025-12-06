import { elevateFounderRole, hasRole } from './roles';

export type OrganizationRole =
  | 'org_owner'
  | 'org_admin'
  | 'org_billing'
  | 'org_security'
  | 'org_member'
  | null
  | undefined;

export type WorkspaceRole =
  | 'workspace_owner'
  | 'workspace_admin'
  | 'admin'
  | 'maintainer'
  | 'editor'
  | 'viewer'
  | null
  | undefined;

export type RoleSource = 'organization' | 'workspace' | 'founder' | 'sso' | 'scim' | 'fallback';

const ORGANIZATION_ROLES = new Set(['org_owner', 'org_admin', 'org_billing', 'org_security', 'org_member']);
const WORKSPACE_ROLES = new Set([
  'workspace_owner',
  'owner',
  'workspace_admin',
  'admin',
  'maintainer',
  'editor',
  'viewer',
]);

const PRIORITY_ORDER = [
  'founder',
  'org_owner',
  'org_admin',
  'org_security',
  'org_billing',
  'workspace_owner',
  'owner',
  'workspace_admin',
  'admin',
  'maintainer',
  'editor',
  'viewer',
  'org_member',
];

const PRIORITY_MAP = PRIORITY_ORDER.reduce<Record<string, number>>((acc, role, index) => {
  acc[role] = index;
  return acc;
}, {});

export interface RoleAuditLog {
  userId?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
  effectiveRole: string;
  requiredRole: string;
  allowed: boolean;
  sourceOfRole: RoleSource;
  timestamp: string;
}

export interface RoleEvaluationUser {
  id?: string | null;
  role?: string | null;
  isFounder?: boolean | null;
  organizationId?: string | null;
  organizationRole?: OrganizationRole;
  workspaceRoles?: Record<string, WorkspaceRole | string | null | undefined>;
  ssoGroups?: string[];
  scimRole?: OrganizationRole | WorkspaceRole | string | null;
  hasAccess?: (workspaceId?: string | null) => boolean;
}

export interface RoleEvaluationOptions {
  ssoRoleMap?: Record<string, string>;
  logger?: (entry: RoleAuditLog) => void;
  clock?: () => Date;
}

export function resolveRoleConflicts({
  workspaceRole,
  organizationRole,
  ssoRole,
  founderFlag,
}: {
  workspaceRole?: string | null;
  organizationRole?: string | null;
  ssoRole?: string | null;
  founderFlag?: boolean | null;
}): string {
  const candidates: string[] = [];
  if (founderFlag) {
    candidates.push('founder');
  }

  if (organizationRole) {
    candidates.push(organizationRole);
  }

  if (ssoRole) {
    candidates.push(ssoRole);
  }

  if (workspaceRole) {
    candidates.push(workspaceRole);
  }

  if (candidates.length === 0) return 'viewer';

  return candidates.reduce((best, current) => {
    const bestPriority = PRIORITY_MAP[best] ?? Number.MAX_SAFE_INTEGER;
    const currentPriority = PRIORITY_MAP[current] ?? Number.MAX_SAFE_INTEGER;
    return currentPriority < bestPriority ? current : best;
  }, candidates[0]);
}

function deriveContext(requiredRole?: string | null): 'workspace' | 'billing' | 'security' | 'organization' {
  if (!requiredRole) return 'workspace';
  if (requiredRole.includes('billing')) return 'billing';
  if (requiredRole === 'org_security') return 'security';
  if (ORGANIZATION_ROLES.has(requiredRole)) return 'organization';
  return 'workspace';
}

function resolveSsoRole(groups: string[] | undefined, ssoRoleMap?: Record<string, string>): string | undefined {
  if (!groups?.length || !ssoRoleMap) return undefined;
  let effective: string | undefined;
  for (const group of groups) {
    const mappedRole = ssoRoleMap[group];
    if (!mappedRole) continue;
    if (!effective) {
      effective = mappedRole;
      continue;
    }
    const currentPriority = PRIORITY_MAP[effective] ?? Number.MAX_SAFE_INTEGER;
    const candidatePriority = PRIORITY_MAP[mappedRole] ?? Number.MAX_SAFE_INTEGER;
    if (candidatePriority < currentPriority) {
      effective = mappedRole;
    }
  }
  return effective;
}

export function getWorkspaceRole(
  user: RoleEvaluationUser | null | undefined,
  workspaceId: string | null | undefined,
  options?: RoleEvaluationOptions,
): { role: string; source: RoleSource } {
  const organizationRole = user?.organizationRole ?? undefined;
  const ssoRole = resolveSsoRole(user?.ssoGroups, options?.ssoRoleMap);
  const directWorkspaceRole = (user?.workspaceRoles?.[workspaceId ?? ''] ?? user?.role) as string | undefined;

  const effectiveRole = resolveRoleConflicts({
    workspaceRole: directWorkspaceRole,
    organizationRole,
    ssoRole,
    founderFlag: user?.isFounder,
  });

  if (effectiveRole === 'founder') return { role: 'founder', source: 'founder' } as const;
  if (effectiveRole === organizationRole) return { role: effectiveRole, source: 'organization' } as const;
  if (effectiveRole === ssoRole) return { role: effectiveRole, source: 'sso' } as const;
  if (effectiveRole === directWorkspaceRole) return { role: effectiveRole, source: 'workspace' } as const;
  return { role: 'viewer', source: 'fallback' } as const;
}

export function evaluateRole(
  user: RoleEvaluationUser | null | undefined,
  workspaceId: string | null | undefined,
  requiredRole: string | null | undefined,
  options?: RoleEvaluationOptions,
): { allowed: boolean; effectiveRole: string; source: RoleSource } {
  const logger = options?.logger ?? ((entry: RoleAuditLog) => console.debug('[rbac]', entry));
  const clock = options?.clock ?? (() => new Date());
  const context = deriveContext(requiredRole);

  const elevatedUser = user ? elevateFounderRole(user) : undefined;

  const rawOrgRole = elevatedUser?.organizationRole ?? undefined;
  const ssoRole = resolveSsoRole(elevatedUser?.ssoGroups, options?.ssoRoleMap);
  const workspaceRole = (elevatedUser?.workspaceRoles?.[workspaceId ?? ''] ?? elevatedUser?.role) as string | undefined;

  const orgRoleForContext = (() => {
    if (!rawOrgRole) return undefined;
    if (context === 'workspace') {
      if (rawOrgRole === 'org_owner' || rawOrgRole === 'org_admin') return rawOrgRole;
      return undefined;
    }
    if (context === 'billing') {
      if (rawOrgRole === 'org_owner' || rawOrgRole === 'org_admin' || rawOrgRole === 'org_billing') return rawOrgRole;
      return undefined;
    }
    if (context === 'security') {
      if (rawOrgRole === 'org_owner' || rawOrgRole === 'org_admin' || rawOrgRole === 'org_security') return rawOrgRole;
      return undefined;
    }
    return rawOrgRole;
  })();

  const ssoRoleForContext = (() => {
    if (!ssoRole) return undefined;
    if (context === 'workspace') {
      if (ssoRole === 'org_owner' || ssoRole === 'org_admin') return ssoRole;
      if (WORKSPACE_ROLES.has(ssoRole)) return ssoRole;
      return undefined;
    }
    if (context === 'billing') {
      if (ssoRole === 'org_owner' || ssoRole === 'org_admin' || ssoRole === 'org_billing') return ssoRole;
      return undefined;
    }
    if (context === 'security') {
      if (ssoRole === 'org_owner' || ssoRole === 'org_admin' || ssoRole === 'org_security') return ssoRole;
      return undefined;
    }
    return ssoRole;
  })();

  const effectiveRole = resolveRoleConflicts({
    workspaceRole,
    organizationRole: orgRoleForContext,
    ssoRole: ssoRoleForContext,
    founderFlag: elevatedUser?.isFounder,
  });

  const allowed = hasRole(effectiveRole, requiredRole ?? 'viewer');

  const source: RoleSource = (() => {
    if (effectiveRole === 'founder') return 'founder';
    if (effectiveRole === orgRoleForContext && orgRoleForContext) return 'organization';
    if (effectiveRole === ssoRoleForContext && ssoRoleForContext) return 'sso';
    if (effectiveRole === workspaceRole && workspaceRole) return 'workspace';
    if (effectiveRole === elevatedUser?.scimRole) return 'scim';
    return 'fallback';
  })();

  const hasWorkspaceAccess =
    context !== 'workspace' || !workspaceId || elevatedUser?.hasAccess?.(workspaceId) !== false;
  const finalAllowed = hasWorkspaceAccess ? allowed : false;

  logger({
    userId: elevatedUser?.id ?? null,
    workspaceId: workspaceId ?? null,
    organizationId: elevatedUser?.organizationId ?? null,
    effectiveRole,
    requiredRole: requiredRole ?? 'viewer',
    allowed: finalAllowed,
    sourceOfRole: source,
    timestamp: clock().toISOString(),
  });

  return { allowed: finalAllowed, effectiveRole, source };
}
