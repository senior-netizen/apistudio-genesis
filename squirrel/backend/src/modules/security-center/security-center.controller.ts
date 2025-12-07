import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountRoleGuard } from '../../common/guards/account-role.guard';
import { AccountRoles } from '../../common/decorators/account-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SecurityCenterService } from './security-center.service';
import { CreateAdminApiKeyDto } from './dto/create-admin-api-key.dto';
import { RotateAdminApiKeyDto } from './dto/rotate-admin-api-key.dto';
import { EmergencyRotationDto } from './dto/emergency-rotation.dto';

@ApiTags('admin-api-keys')
@Controller({ path: 'admin/security-center/api-keys', version: '1' })
@UseGuards(JwtAuthGuard, AccountRoleGuard)
@AccountRoles('admin', 'founder')
export class SecurityCenterController {
  constructor(private readonly security: SecurityCenterService, private readonly config: ConfigService) {}

  private ensureEmergencyEnabled() {
    const enabled = this.config.get<boolean>('app.features.securityCenterEnabled');
    const emergencyEnabled = this.config.get<boolean>('app.features.emergencyRotationEnabled');
    if (!enabled || !emergencyEnabled) {
      throw new NotFoundException();
    }
  }

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

  @Post('rotate-all')
  rotateAll(@CurrentUser() user: { id: string; role?: string }, @Body() dto: EmergencyRotationDto) {
    this.ensureEmergencyEnabled();
    return this.security.rotateAll(user, dto);
  }

  @Post('rotate-org/:orgId')
  rotateOrg(
    @CurrentUser() user: { id: string; role?: string },
    @Param('orgId') orgId: string,
    @Body() dto: EmergencyRotationDto,
  ) {
    this.ensureEmergencyEnabled();
    return this.security.rotateOrg(user, orgId, dto);
  }

  @Post('rotate-workspace/:workspaceId')
  rotateWorkspace(
    @CurrentUser() user: { id: string; role?: string },
    @Param('workspaceId') workspaceId: string,
    @Body() dto: EmergencyRotationDto,
  ) {
    this.ensureEmergencyEnabled();
    return this.security.rotateWorkspace(user, workspaceId, dto);
  }

  @Post('rotate-region/:regionCode')
  rotateRegion(
    @CurrentUser() user: { id: string; role?: string },
    @Param('regionCode') regionCode: string,
    @Body() dto: EmergencyRotationDto,
  ) {
    this.ensureEmergencyEnabled();
    return this.security.rotateRegion(user, regionCode, dto);
  }

  @Post('rollback/:batchId')
  rollback(@CurrentUser() user: { id: string; role?: string }, @Param('batchId') batchId: string) {
    this.ensureEmergencyEnabled();
    return this.security.rollback(user, batchId);
  }
}
