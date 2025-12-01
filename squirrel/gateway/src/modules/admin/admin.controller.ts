import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService, AdminRequestContext } from './admin.service';
import { Request } from 'express';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class ChangeRoleDto {
  @IsString()
  role!: string;
}

class AdjustCreditsDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

class AssignOrganizationPlanDto {
  @IsString()
  plan!: string;
}

class SessionTakeoverDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

enum LogType {
  REQUESTS = 'requests',
  ERRORS = 'errors',
  AI = 'ai',
}

@Controller({ path: 'admin', version: VERSION_NEUTRAL })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private buildContext(req: Request): AdminRequestContext {
    const requestWithUser = req as Request & { user?: Record<string, unknown> };
    const user = requestWithUser.user ?? {};
    const roles = Array.isArray(user['roles']) ? (user['roles'] as string[]) : [];
    const actorId = (user['sub'] ?? user['id'] ?? user['userId']) as string | undefined;
    const actorEmail = user['email'] as string | undefined;
    return {
      actorId,
      actorEmail,
      actorRoles: roles,
      authorization: req.headers.authorization,
    };
  }

  @Get('users')
  @Roles('founder', 'admin')
  listUsers(@Req() req: Request, @Query('search') search?: string) {
    const ctx = this.buildContext(req);
    return this.adminService.listUsers(ctx, search);
  }

  @Post('users/:id/role')
  @Roles('founder', 'admin')
  changeRole(@Req() req: Request, @Param('id') id: string, @Body() body: ChangeRoleDto) {
    const ctx = this.buildContext(req);
    return this.adminService.changeUserRole(ctx, id, body.role);
  }

  @Get('logs/:type')
  @Roles('founder', 'admin')
  fetchLogs(@Req() req: Request, @Param('type') type: LogType) {
    const ctx = this.buildContext(req);
    return this.adminService.fetchRequestLogs(ctx, type);
  }

  @Get('billing/user/:id')
  @Roles('founder', 'admin')
  getBilling(@Req() req: Request, @Param('id') id: string) {
    const ctx = this.buildContext(req);
    return this.adminService.fetchBillingForUser(ctx, id);
  }

  @Post('billing/user/:id/credits-adjust')
  @Roles('founder', 'admin')
  adjustCredits(@Req() req: Request, @Param('id') id: string, @Body() body: AdjustCreditsDto) {
    const ctx = this.buildContext(req);
    return this.adminService.adjustCredits(ctx, id, body.amount, body.reason);
  }

  @Get('system/health')
  @Roles('founder', 'admin')
  systemHealth(@Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.adminService.systemHealth(ctx);
  }

  @Get('sessions/active')
  @Roles('founder', 'admin')
  sessions(@Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.adminService.listActiveSessions(ctx);
  }

  @Post('sessions/:sessionId/takeover')
  @Roles('founder', 'admin')
  takeover(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Body() body: SessionTakeoverDto,
  ) {
    const ctx = this.buildContext(req);
    return this.adminService.requestSessionTakeover(ctx, sessionId, body.reason);
  }

  @Get('organizations')
  @Roles('founder', 'admin')
  listOrganizations(@Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.adminService.listOrganizations(ctx);
  }

  @Get('organizations/:id/members')
  @Roles('founder', 'admin')
  getOrganizationMembers(@Req() req: Request, @Param('id') organizationId: string) {
    const ctx = this.buildContext(req);
    return this.adminService.getOrganizationMembers(ctx, organizationId);
  }

  @Post('organizations/:id/members/:memberId/role')
  @Roles('founder', 'admin')
  changeOrganizationRole(
    @Req() req: Request,
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() body: ChangeRoleDto,
  ) {
    const ctx = this.buildContext(req);
    return this.adminService.updateOrganizationMemberRole(ctx, organizationId, memberId, body.role);
  }

  @Get('organizations/:id/billing')
  @Roles('founder', 'admin')
  organizationBilling(@Req() req: Request, @Param('id') organizationId: string) {
    const ctx = this.buildContext(req);
    return this.adminService.getOrganizationBilling(ctx, organizationId);
  }

  @Get('organizations/:id/usage')
  @Roles('founder', 'admin')
  organizationUsage(@Req() req: Request, @Param('id') organizationId: string) {
    const ctx = this.buildContext(req);
    return this.adminService.getOrganizationUsage(ctx, organizationId);
  }

  @Post('organizations/:id/plan')
  @Roles('founder', 'admin')
  assignOrganizationPlan(
    @Req() req: Request,
    @Param('id') organizationId: string,
    @Body() body: AssignOrganizationPlanDto,
  ) {
    const ctx = this.buildContext(req);
    return this.adminService.assignOrganizationPlan(ctx, organizationId, body.plan);
  }
}
