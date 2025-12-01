import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AdvisorModule } from '../advisor/advisor.module';
import { ComposerModule } from '../composer/composer.module';
import { EnvHelperModule } from '../env-helper/env-helper.module';
import { OptimizerModule } from '../optimizer/optimizer.module';
import { TestsModule } from '../tests/tests.module';
import { AiProviderModule } from '../../shared/providers/ai-provider.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    AiProviderModule,
    AdvisorModule,
    ComposerModule,
    TestsModule,
    EnvHelperModule,
    OptimizerModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
