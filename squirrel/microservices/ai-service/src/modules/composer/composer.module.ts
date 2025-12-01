import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../shared/providers/ai-provider.module';
import { ComposerController } from './composer.controller';
import { ComposerService } from './composer.service';

@Module({
  imports: [AiProviderModule],
  controllers: [ComposerController],
  providers: [ComposerService],
  exports: [ComposerService],
})
export class ComposerModule {}
