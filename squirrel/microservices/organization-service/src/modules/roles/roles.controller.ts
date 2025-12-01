import { Controller, Get } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('organizations/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('organization')
  listOrganizationRoles() {
    return this.rolesService.listOrganizationRoles();
  }

  @Get('team')
  listTeamRoles() {
    return this.rolesService.listTeamRoles();
  }

  @Get('workspace')
  listWorkspacePermissions() {
    return this.rolesService.listWorkspacePermissions();
  }
}
