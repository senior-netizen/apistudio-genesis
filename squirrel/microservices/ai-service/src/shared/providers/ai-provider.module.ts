import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AiProviderService } from './ai-provider.service';
import { LocalAiProvider } from './local-ai.provider';
import { NullAiProvider } from './null-ai.provider';
import { RemoteAiProvider } from './remote-ai.provider';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [AiProviderService, LocalAiProvider, RemoteAiProvider, NullAiProvider],
  exports: [AiProviderService],
})
export class AiProviderModule {}
