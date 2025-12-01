import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { AuthenticatedRequest } from '../../shared/types/authenticated-request';
import { UsageQueryDto } from './dto/usage-query.dto';
import { UsageService } from './usage.service';

@ApiTags('usage')
@Controller({ path: 'v1/billing', version: '1' })
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('me/usage')
  @Roles('user', 'paid', 'pro', 'admin', 'founder')
  @ApiOperation({ summary: 'List usage events for the authenticated user' })
  getMyUsage(@Req() request: AuthenticatedRequest, @Query() query: UsageQueryDto) {
    const userId = request.user?.id as string;
    return this.usageService.findForUser(userId, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      type: query.type,
    });
  }

  @Get('admin/user-usage/:userId')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'List usage events for a specific user (admin only)' })
  getUserUsage(@Param('userId') userId: string, @Query() query: UsageQueryDto) {
    return this.usageService.findForAdmin(userId, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      type: query.type,
    });
  }
}
