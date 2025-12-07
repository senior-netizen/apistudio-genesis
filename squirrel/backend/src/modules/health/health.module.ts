import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { LandingController } from './landing.controller';
import { QueueHealthController } from './queue-health.controller';
import { RegionHealthController } from './region-health.controller';

@Module({
  controllers: [HealthController, LandingController, QueueHealthController, RegionHealthController],
})
export class HealthModule {}
