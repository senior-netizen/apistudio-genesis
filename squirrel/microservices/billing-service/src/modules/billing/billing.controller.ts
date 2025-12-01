import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { CheckFeatureDto } from './dto/check-feature.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller({ path: 'v1', version: '1' })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Patch('plan')
  @Roles('paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Update subscription plan for a user' })
  updatePlan(@Body() payload: UpdatePlanDto) {
    return this.billingService.updatePlan(payload);
  }

  @Post('credits/adjust')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Adjust credits balance manually' })
  adjustCredits(@Body() payload: AdjustCreditsDto) {
    return this.billingService.adjustCredits(payload);
  }

  @Post('feature/check')
  @Roles('user', 'paid', 'pro', 'admin', 'founder')
  @ApiOperation({ summary: 'Validate that a user can access a gated feature' })
  checkFeature(@Body() payload: CheckFeatureDto) {
    return this.billingService.checkFeature(
      { userId: payload.userId, organizationId: payload.organizationId },
      payload.feature,
      payload.creditCost ?? 0,
    );
  }

  @Get('organization/:id/billing')
  @Roles('founder', 'admin')
  @ApiOperation({ summary: 'Retrieve billing state for an organization' })
  getOrganizationBilling(@Param('id') organizationId: string) {
    return this.billingService.getOrganizationBillingState(organizationId);
  }

  @Get('organization/:id/usage')
  @Roles('founder', 'admin')
  @ApiOperation({ summary: 'Retrieve usage events for an organization' })
  getOrganizationUsage(@Param('id') organizationId: string) {
    return this.billingService.getOrganizationUsage(organizationId);
  }
}
