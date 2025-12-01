import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { PaynowService } from './paynow.service';

interface TopUpRequest {
  userId: string;
  amount: number;
  reference?: string;
}

@ApiTags('paynow')
@Controller({ path: 'v1/billing/mock', version: '1' })
export class PaynowController {
  constructor(private readonly paynowService: PaynowService) {}

  @Post('topup-credits')
  @Roles('user', 'paid', 'pro', 'admin', 'founder')
  @ApiOperation({ summary: 'Simulate a Paynow credit top-up' })
  topUpCredits(@Body() payload: TopUpRequest) {
    return this.paynowService.simulateTopUp(payload);
  }

  @Post('activate-pro')
  @Roles('user', 'paid', 'pro', 'admin', 'founder')
  @ApiOperation({ summary: 'Simulate upgrading to PRO using Paynow' })
  activatePro(@Body('userId') userId: string) {
    return this.paynowService.simulateActivatePro(userId);
  }
}
