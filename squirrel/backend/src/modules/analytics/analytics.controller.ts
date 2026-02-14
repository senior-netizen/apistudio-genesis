import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '../../infra/prisma/enums';

@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  async summary(@Query('workspaceId') workspaceId: string) {
    return this.analytics.summary(this.requireWorkspaceId(workspaceId));
  }

  @Get('performance')
  @Roles(WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  async performance(
    @Query('workspaceId') workspaceId: string,
    @Query('windowMinutes') windowMinutes?: string,
  ) {
    return this.analytics.performance(
      this.requireWorkspaceId(workspaceId),
      this.parseWindowMinutes(windowMinutes),
    );
  }

  @Get('errors')
  @Roles(WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  async errors(
    @Query('workspaceId') workspaceId: string,
    @Query('windowMinutes') windowMinutes?: string,
  ) {
    return this.analytics.errors(
      this.requireWorkspaceId(workspaceId),
      this.parseWindowMinutes(windowMinutes),
    );
  }

  private requireWorkspaceId(workspaceId?: string): string {
    if (!workspaceId?.trim()) {
      throw new BadRequestException('workspaceId query parameter is required.');
    }
    return workspaceId;
  }

  private parseWindowMinutes(value?: string): number {
    if (!value) {
      return 60;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('windowMinutes must be numeric.');
    }

    return parsed;
  }
}
