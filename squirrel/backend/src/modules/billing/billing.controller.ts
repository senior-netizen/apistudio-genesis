import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpgradeDto } from './dto/upgrade.dto';

@ApiTags('billing')
@Controller({ path: 'billing', version: '1' })
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('upgrade')
  async upgrade(@CurrentUser() user: { id: string }, @Body() dto: UpgradeDto) {
    if (!this.billing.isEnabled()) {
      throw new ForbiddenException({ code: 'BILLING_DISABLED', message: 'Billing is not configured' });
    }
    return this.billing.createUpgradeSession(user.id, dto);
  }

  @Post('portal')
  async portal(@CurrentUser() user: { id: string }) {
    if (!this.billing.isEnabled()) {
      throw new ForbiddenException({ code: 'BILLING_DISABLED', message: 'Billing is not configured' });
    }
    return this.billing.createPortalSession(user.id);
  }
}
