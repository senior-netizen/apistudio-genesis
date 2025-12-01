import { Body, Controller, Post } from '@nestjs/common';
import { Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { AddCreditsDto } from './dto/add-credits.dto';
import { DeductCreditsDto } from './dto/deduct-credits.dto';
import { CreditsService } from './credits.service';

@ApiTags('credits')
@Controller({ path: 'v1/billing', version: '1' })
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('credits/:userId')
  @ApiOperation({ summary: 'Get credits balance and recent usage for a user' })
  getCredits(@Param('userId') userId: string) {
    return this.creditsService.getCreditsOverview(userId);
  }

  @Post('admin/credits/add')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Add credits to a user account manually' })
  addCredits(@Body() payload: AddCreditsDto) {
    if (payload.organizationId) {
      return this.creditsService.addOrganizationCredits(
        payload.organizationId,
        payload.amount,
        payload.reason,
      );
    }
    if (!payload.userId) {
      throw new Error('Either organizationId or userId must be provided');
    }
    return this.creditsService.addCredits(payload.userId, payload.amount, payload.reason);
  }

  @Post('admin/credits/deduct')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Deduct credits from a user account manually' })
  deductCredits(@Body() payload: DeductCreditsDto) {
    if (payload.organizationId) {
      return this.creditsService.deductOrganizationCredits(
        payload.organizationId,
        payload.amount,
        payload.type,
        payload.metadata,
      );
    }
    if (!payload.userId) {
      throw new Error('Either organizationId or userId must be provided');
    }
    return this.creditsService.deductCredits(
      payload.userId,
      payload.amount,
      payload.type,
      payload.metadata,
    );
  }
}
