import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InfraModule } from '../../infra/infra.module';
import { PaynowService } from './paynow.service';
import { BillingSettlementService } from './billing-settlement.service';
import { BillingSettlementAlertService } from './billing-settlement-alert.service';
@Module({
  imports: [InfraModule],
  controllers: [BillingController],
  providers: [BillingService, PaynowService, BillingSettlementService, BillingSettlementAlertService],
  exports: [BillingService],
})
export class BillingModule {}
