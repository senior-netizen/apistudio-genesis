import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeatureGateService } from '../../shared/services/feature-gate.service';
import { CreditsModule } from '../credits/credits.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaynowModule } from '../paynow/paynow.module';
import { PlansModule } from '../plans/plans.module';
import { UsageModule } from '../usage/usage.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [ConfigModule, PlansModule, CreditsModule, UsageModule, InvoicesModule, PaynowModule],
  controllers: [BillingController],
  providers: [BillingService, FeatureGateService],
  exports: [BillingService, FeatureGateService, PlansModule, CreditsModule, UsageModule, InvoicesModule, PaynowModule],
})
export class BillingModule {}
