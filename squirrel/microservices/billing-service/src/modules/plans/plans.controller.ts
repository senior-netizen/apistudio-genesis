import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { AuthenticatedRequest } from '../../shared/types/authenticated-request';
import { CreditsService } from '../credits/credits.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('plans')
@Controller({ path: 'v1/billing', version: '1' })
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly creditsService: CreditsService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available billing plans' })
  listPlans() {
    return this.plansService.listPlans();
  }

  @Get('me/plan')
  @Roles('user', 'paid', 'pro', 'admin', 'founder')
  @ApiOperation({ summary: 'Get the current plan and credit balance for the authenticated user' })
  async getMyPlan(@Req() request: AuthenticatedRequest) {
    const organizationIdHeader = request.headers['x-organization-id'];
    const organizationId = Array.isArray(organizationIdHeader)
      ? organizationIdHeader[0]
      : organizationIdHeader;
    if (organizationId) {
      await this.creditsService.ensureOrganizationState(String(organizationId));
      const state = await this.plansService.getOrganizationPlan(String(organizationId));
      return {
        organizationId: String(organizationId),
        plan: state?.currentPlan ?? state?.currentPlanId ?? 'FREE',
        creditsBalance: state?.creditsBalance ?? 0,
        renewDate: state?.renewDate ?? null,
        status: state?.status ?? 'active',
      };
    }

    const userId = request.user?.id as string;
    await this.creditsService.ensureUserState(userId);
    const state = await this.plansService.getUserPlan(userId);
    return {
      userId,
      plan: state?.currentPlan ?? state?.currentPlanId ?? 'FREE',
      creditsBalance: state?.creditsBalance ?? 0,
      renewDate: state?.renewDate ?? null,
      status: state?.status ?? 'active',
    };
  }

  @Post('change-plan')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Change a user plan (admin simulation endpoint)' })
  requestPlanChange(@Body() payload: ChangePlanDto) {
    return this.plansService.changePlan(payload);
  }
}
