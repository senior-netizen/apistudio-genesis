const normalize = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed.toLowerCase() : undefined;
};

const FOUNDER_ROLE = 'founder';

const getOwnerEmail = (): string | undefined => normalize(process.env.OWNER_EMAIL);

export const resolveAccountRole = (email?: string | null, storedRole?: string | null): string => {
  const ownerEmail = getOwnerEmail();
  const normalizedEmail = normalize(email);
  if (ownerEmail && normalizedEmail === ownerEmail) {
    return FOUNDER_ROLE;
  }
  if (isReservedRole(storedRole)) {
    return 'user';
  }
  return storedRole ?? 'user';
};

const isReservedRole = (value?: string | null): boolean => {
  const normalized = normalize(value);
  return normalized === FOUNDER_ROLE || normalized === 'owner';
};

const extractRoleValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'set' in value && typeof (value as { set?: unknown }).set === 'string') {
    return (value as { set?: string }).set;
  }
  return undefined;
};

export const assertOwnerRoleNotAssigned = (roleValue: unknown): void => {
  const role = extractRoleValue(roleValue);
  if (!role) {
    return;
  }
  if (isReservedRole(role)) {
    throw new Error('Role "founder" is reserved and cannot be assigned via database writes.');
  }
};
