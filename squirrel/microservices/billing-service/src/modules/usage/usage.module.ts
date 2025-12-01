import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../../config/redis.module';
import { UsageEventEntity } from '../../shared/entities';
import { CreditsModule } from '../credits/credits.module';
import { UsageEventsListener } from './listeners/usage-events.listener';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageEventEntity]),
    RedisModule,
    forwardRef(() => CreditsModule),
  ],
  controllers: [UsageController],
  providers: [UsageService, UsageEventsListener],
  exports: [UsageService],
})
export class UsageModule {}
