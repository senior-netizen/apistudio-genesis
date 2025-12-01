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
}
