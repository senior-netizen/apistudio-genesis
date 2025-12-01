import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '../../infra/prisma/enums';
import { AccountRoles } from '../../common/decorators/account-roles.decorator';
import { AccountRoleGuard } from '../../common/guards/account-role.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';

@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @UseGuards(AccountRoleGuard)
  @AccountRoles('admin', 'founder')
  @Get('control/overview')
  overview() {
    return this.admin.overview();
  }

  @UseGuards(AccountRoleGuard)
  @AccountRoles('admin', 'founder')
  @Get('control/users')
  users() {
    return this.admin.listUsers();
  }

  @UseGuards(AccountRoleGuard, OwnerGuard)
  @AccountRoles('founder')
  @Patch('control/users/:id/promote')
  promote(@Param('id') id: string) {
    return this.admin.setAccountRole(id, 'admin');
  }

  @UseGuards(AccountRoleGuard, OwnerGuard)
  @AccountRoles('founder')
  @Patch('control/users/:id/demote')
  demote(@Param('id') id: string) {
    return this.admin.setAccountRole(id, 'user');
  }

  @UseGuards(AccountRoleGuard)
  @AccountRoles('admin', 'founder')
  @Patch('control/users/:id/freeze')
  freeze(@Param('id') id: string, @Body() body: { frozen: boolean }) {
    return this.admin.setAccountFrozen(id, Boolean(body.frozen));
  }

  @UseGuards(AccountRoleGuard)
  @AccountRoles('admin', 'founder')
  @Get('control/activity')
  activity() {
    return this.admin.recentActivity();
  }

  @UseGuards(AccountRoleGuard)
  @AccountRoles('admin', 'founder')
  @Get('control/system-health')
  systemHealth() {
    return this.admin.systemHealth();
  }

  @UseGuards(RbacGuard)
  @Roles(WorkspaceRole.OWNER)
  @Get('feature-flags')
  listFlags() {
    return this.admin.listFeatureFlags();
  }

  @UseGuards(RbacGuard)
  @Roles(WorkspaceRole.OWNER)
  @Patch('feature-flags')
  updateFlag(
    @Body()
    body: {
      key: string;
      enabled: boolean;
      payload?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    },
  ) {
    return this.admin.updateFeatureFlag(body.key, body.enabled, body.payload);
  }

  @UseGuards(RbacGuard)
  @Roles(WorkspaceRole.OWNER)
  @Get('rate-limits')
  rateLimits() {
    return this.admin.listRateLimits();
  }
}
