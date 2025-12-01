import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../shared/providers/ai-provider.module';
import { OptimizerController } from './optimizer.controller';
import { OptimizerService } from './optimizer.service';

@Module({
  imports: [AiProviderModule],
  controllers: [OptimizerController],
  providers: [OptimizerService],
  exports: [OptimizerService],
})
export class OptimizerModule {}
