import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InfraModule } from '../../infra/infra.module';
import { PaynowService } from './paynow.service';
@Module({
  imports: [InfraModule],
  controllers: [BillingController],
  providers: [BillingService, PaynowService],
  exports: [BillingService],
})
export class BillingModule {}
