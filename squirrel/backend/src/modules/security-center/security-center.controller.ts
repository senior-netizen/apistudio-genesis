import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountRoleGuard } from '../../common/guards/account-role.guard';
import { AccountRoles } from '../../common/decorators/account-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SecurityCenterService } from './security-center.service';
import { CreateAdminApiKeyDto } from './dto/create-admin-api-key.dto';
import { RotateAdminApiKeyDto } from './dto/rotate-admin-api-key.dto';

@ApiTags('admin-api-keys')
@Controller({ path: 'admin/security-center/api-keys', version: '1' })
@UseGuards(JwtAuthGuard, AccountRoleGuard)
@AccountRoles('admin', 'founder')
export class SecurityCenterController {
  constructor(private readonly security: SecurityCenterService) {}

  @Post()
  create(@CurrentUser() user: { id: string; role?: string }, @Body() dto: CreateAdminApiKeyDto) {
    return this.security.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: { id: string; role?: string },
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.security.list(user, workspaceId);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.security.revoke(user, id);
  }

  @Post(':id/rotate')
  rotate(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: RotateAdminApiKeyDto,
  ) {
    return this.security.rotate(user, id, dto);
  }
}
