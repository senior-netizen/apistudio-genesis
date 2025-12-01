import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPlanEntity, OrganizationBillingStateEntity, UserBillingStateEntity } from '../../shared/entities';
import { CreditsModule } from '../credits/credits.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingPlanEntity, UserBillingStateEntity, OrganizationBillingStateEntity]),
    CreditsModule,
  ],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
