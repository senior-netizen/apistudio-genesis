import { Injectable } from '@nestjs/common';
import { OrganizationRole, TeamRole, SharedWorkspacePermission } from '../../shared/constants/organization-roles';

@Injectable()
export class RolesService {
  listOrganizationRoles() {
    return Object.values(OrganizationRole);
  }

  listTeamRoles() {
    return Object.values(TeamRole);
  }

  listWorkspacePermissions() {
    return Object.values(SharedWorkspacePermission);
  }
}
