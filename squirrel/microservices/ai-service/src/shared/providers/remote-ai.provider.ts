import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AiCompletionPayload, AiCompletionResult, AiProvider } from './ai-provider.interface';

@Injectable()
export class RemoteAiProvider implements AiProvider {
  readonly name = 'remote-api';
  readonly supportsStreaming = false;
  private readonly logger = new Logger(RemoteAiProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async generateCompletion(payload: AiCompletionPayload): Promise<AiCompletionResult> {
    const endpoint = this.configService.get<string>('AI_REMOTE_API_URL');
    const apiKey = this.configService.get<string>('AI_REMOTE_API_KEY');
    const model = this.configService.get<string>('AI_MODEL_NAME') ?? 'general-purpose-v1';

    if (!endpoint || !apiKey) {
      this.logger.warn('Remote AI provider is not fully configured; falling back to stub output');
      return {
        provider: this.name,
        model,
        output: 'Remote provider unavailable – check AI_REMOTE_API_URL and AI_REMOTE_API_KEY.',
        metadata: { configured: false },
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<AiCompletionResult>(
          endpoint,
          {
            model,
            task: payload.task,
            input: payload.input,
            context: payload.context,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15_000,
          },
        ),
      );

      if (response.data?.output) {
        return {
          ...response.data,
          provider: this.name,
          model,
        };
      }

      return {
        provider: this.name,
        model,
        output: 'Remote provider returned an empty response.',
        metadata: { status: response.status },
      };
    } catch (error) {
      this.logger.error(`Remote AI provider call failed for task ${payload.task}`, error as Error);
      return {
        provider: this.name,
        model,
        output: 'Remote provider call failed. Check logs for details.',
        metadata: { error: (error as Error).message },
      };
    }
  }
}
