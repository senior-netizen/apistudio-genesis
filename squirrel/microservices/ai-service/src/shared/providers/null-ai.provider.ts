import { Injectable } from '@nestjs/common';
import { AiCompletionPayload, AiCompletionResult, AiProvider } from './ai-provider.interface';

@Injectable()
export class NullAiProvider implements AiProvider {
  readonly name = 'disabled';
  readonly supportsStreaming = false;

  async generateCompletion(payload: AiCompletionPayload): Promise<AiCompletionResult> {
    return {
      provider: this.name,
      output: `AI provider disabled. Unable to process task: ${payload.task}.`,
      metadata: { reason: 'no-provider-configured' },
    };
  }
}
