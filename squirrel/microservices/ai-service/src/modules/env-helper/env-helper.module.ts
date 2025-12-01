import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../shared/providers/ai-provider.module';
import { EnvHelperController } from './env-helper.controller';
import { EnvHelperService } from './env-helper.service';

@Module({
  imports: [AiProviderModule],
  controllers: [EnvHelperController],
  providers: [EnvHelperService],
  exports: [EnvHelperService],
})
export class EnvHelperModule {}
