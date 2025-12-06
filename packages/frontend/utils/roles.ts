import { RoleLevels } from '../../common/rbac/roles';
export { RoleLevels } from '../../common/rbac/roles';

export function getEffectiveRole<T extends { role?: string | null; isFounder?: boolean | null }>(
  user: T | null | undefined,
): string {
  if (user?.isFounder) return 'founder';
  return user?.role || 'viewer';
}

export function can<T extends { role?: string | null; isFounder?: boolean | null }>(
  user: T | null | undefined,
  requiredRole: keyof typeof RoleLevels,
): boolean {
  const role = getEffectiveRole(user);
  return RoleLevels[role] >= RoleLevels[requiredRole];
}
