import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteDto } from './dto/invite.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '../../infra/prisma/enums';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CreateMagicInviteDto } from './dto/create-magic-invite.dto';
import type { WorkspaceBundle } from './workspace.types';

@ApiTags('workspaces')
@Controller({ path: 'workspaces', version: '1' })
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.workspaces.listForUser(user.id, parseInt(page, 10), parseInt(pageSize, 10));
  }

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto);
  }

  @Get(':workspaceId')
  async getById(@CurrentUser() user: { id: string }, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.getById(workspaceId, user.id);
  }

  @UseGuards(RbacGuard)
  @Roles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post(':workspaceId/invite')
  async invite(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteDto,
  ) {
    return this.workspaces.invite(workspaceId, user.id, dto);
  }

  @UseGuards(RbacGuard)
  @Roles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post(':workspaceId/invites/magic')
  async createMagicInvite(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateMagicInviteDto,
  ) {
    return this.workspaces.createMagicInvite(workspaceId, user.id, dto);
  }

  @Get(':workspaceId/audit-logs')
  async auditLogs(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit = '5',
    @Query('actions') actions?: string,
  ) {
    const parsedLimit = Number.isFinite(Number.parseInt(limit, 10)) ? Number.parseInt(limit, 10) : 5;
    const requestedActions = actions
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return this.workspaces.listAuditLogs(workspaceId, user.id, {
      limit: parsedLimit,
      actions: requestedActions,
    });
  }

  @Get(':workspaceId/export')
  async exportWorkspace(@CurrentUser() user: { id: string }, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.exportBundle(workspaceId, user.id);
  }

  @Post(':workspaceId/import')
  async importWorkspace(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Query('dryRun') dryRun = 'false',
    @Body() bundle: WorkspaceBundle,
  ) {
    const dryRunFlag = String(dryRun).toLowerCase() === 'true';
    return this.workspaces.importBundle(workspaceId, user.id, bundle, { dryRun: dryRunFlag });
  }
}
