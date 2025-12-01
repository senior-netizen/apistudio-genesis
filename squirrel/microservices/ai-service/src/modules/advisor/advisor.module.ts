import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../shared/providers/ai-provider.module';
import { AdvisorController } from './advisor.controller';
import { AdvisorService } from './advisor.service';

@Module({
  imports: [AiProviderModule],
  controllers: [AdvisorController],
  providers: [AdvisorService],
  exports: [AdvisorService],
})
export class AdvisorModule {}
