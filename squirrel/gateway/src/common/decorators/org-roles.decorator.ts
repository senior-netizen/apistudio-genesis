import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '../types/organization-role.type';

export const ORG_ROLES_KEY = 'orgRoles';
export const OrgRoles = (...roles: OrganizationRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
