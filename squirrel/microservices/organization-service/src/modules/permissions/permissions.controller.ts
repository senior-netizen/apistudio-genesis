import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { OrganizationRole } from '../../shared/constants/organization-roles';
import { RequestWithUser } from '../../common/types/request-with-user';

@Controller('organizations/:orgId/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('members')
  listMembers(@Param('orgId') orgId: string) {
    return this.permissionsService.listMembersWithRoles(orgId);
  }

  @Post('assert')
  assertPermission(
    @Param('orgId') orgId: string,
    @Body('roles') roles: OrganizationRole[],
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id ?? req.headers['x-user-id'];
    return this.permissionsService.assertUserRole(orgId, String(userId), roles ?? []);
  }
}
