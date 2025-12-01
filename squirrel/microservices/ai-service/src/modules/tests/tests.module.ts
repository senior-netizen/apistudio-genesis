import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../shared/providers/ai-provider.module';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  imports: [AiProviderModule],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
