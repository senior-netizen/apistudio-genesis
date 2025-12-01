import { SetMetadata } from '@nestjs/common';

export const ACCOUNT_ROLES_KEY = 'account_roles';

export type AccountRole = 'user' | 'admin' | 'founder' | 'owner' | string;

export const AccountRoles = (...roles: AccountRole[]) => SetMetadata(ACCOUNT_ROLES_KEY, roles);
