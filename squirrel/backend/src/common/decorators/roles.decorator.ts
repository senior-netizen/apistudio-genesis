import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '../../infra/prisma/enums';
import { ROLES_KEY } from '../guards/rbac.guard';

export const Roles = (...roles: WorkspaceRole[]) => SetMetadata(ROLES_KEY, roles);
