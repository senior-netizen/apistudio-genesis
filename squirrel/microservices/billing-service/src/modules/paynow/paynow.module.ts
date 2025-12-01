import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { PlansModule } from '../plans/plans.module';
import { PaynowController } from './paynow.controller';
import { PaynowService } from './paynow.service';

@Module({
  imports: [CreditsModule, PlansModule],
  controllers: [PaynowController],
  providers: [PaynowService],
  exports: [PaynowService],
})
export class PaynowModule {}
