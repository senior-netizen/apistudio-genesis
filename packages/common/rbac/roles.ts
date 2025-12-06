export const RoleLevels: Record<string, number> = {
  founder: 5,
  admin: 4,
  maintainer: 3,
  editor: 2,
  viewer: 1,
};

const normalizeRole = (role?: string | null): string | undefined => {
  if (!role) return undefined;
  const trimmed = role.toString().trim().toLowerCase();
  return trimmed.length ? trimmed : undefined;
};

export function hasRole(userRole: string | null | undefined, requiredRole: string | null | undefined): boolean {
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedRequiredRole = normalizeRole(requiredRole);

  if (!normalizedRequiredRole) {
    return true;
  }

  const requiredLevel = RoleLevels[normalizedRequiredRole] ?? 0;
  const userLevel = normalizedUserRole ? RoleLevels[normalizedUserRole] ?? 0 : 0;

  if (requiredLevel > 0 && userLevel > 0) {
    return userLevel >= requiredLevel;
  }

  if (normalizedUserRole && normalizedRequiredRole) {
    return normalizedUserRole === normalizedRequiredRole;
  }

  return false;
}

export function elevateFounderRole<T extends { role?: string | null; isFounder?: boolean | null }>(
  user: T,
): T {
  if (user?.isFounder && user.role !== 'founder') {
    return { ...user, role: 'founder' } as T;
  }
  return user;
}
