import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPlanEntity, OrganizationBillingStateEntity, UserBillingStateEntity } from '../../shared/entities';
import { UsageModule } from '../usage/usage.module';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserBillingStateEntity, OrganizationBillingStateEntity, BillingPlanEntity]),
    forwardRef(() => UsageModule),
  ],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
