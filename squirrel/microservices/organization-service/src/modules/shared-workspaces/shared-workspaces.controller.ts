import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SharedWorkspacesService } from './shared-workspaces.service';
import { ShareWorkspaceDto } from './dto/share-workspace.dto';
import { UpdateWorkspacePermissionDto } from './dto/update-workspace-permission.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../shared/roles.decorator';
import { OrganizationRole } from '../../shared/constants/organization-roles';

@Controller('organizations/:orgId/workspaces')
@UseGuards(RolesGuard)
export class SharedWorkspacesController {
  constructor(private readonly sharedWorkspacesService: SharedWorkspacesService) {}

  @Post('share')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  share(@Param('orgId') organizationId: string, @Body() dto: ShareWorkspaceDto) {
    return this.sharedWorkspacesService.shareWorkspace(organizationId, dto);
  }

  @Get()
  list(@Param('orgId') organizationId: string) {
    return this.sharedWorkspacesService.listSharedWorkspaces(organizationId);
  }

  @Patch(':workspaceId/permissions')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  updatePermission(
    @Param('orgId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspacePermissionDto,
  ) {
    return this.sharedWorkspacesService.updatePermission(organizationId, workspaceId, dto);
  }
}
