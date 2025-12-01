import { Injectable, Logger } from '@nestjs/common';
import { AiCompletionPayload, AiCompletionResult, AiProvider } from './ai-provider.interface';

@Injectable()
export class LocalAiProvider implements AiProvider {
  readonly name = 'local-simulator';
  readonly supportsStreaming = false;
  private readonly logger = new Logger(LocalAiProvider.name);

  async generateCompletion(payload: AiCompletionPayload): Promise<AiCompletionResult> {
    this.logger.debug(`Generating ${payload.task} insight using local heuristics`);
    const contextSummary = this.buildContextSummary(payload.context);
    const output =
      `Simulated ${payload.task} insight based on lightweight heuristics. ${contextSummary}`.trim();

    return {
      provider: this.name,
      model: 'heuristic-v1',
      output,
      metadata: { simulated: true },
    };
  }

  private buildContextSummary(context: Record<string, unknown> | undefined): string {
    if (!context) {
      return 'No context provided.';
    }
    const keys = Object.keys(context);
    if (keys.length === 0) {
      return 'Context object was empty.';
    }
    const snippet = keys
      .slice(0, 5)
      .map((key) => `${key}: ${this.stringifyValue(context[key])}`)
      .join(', ');
    return `Context snapshot → ${snippet}`;
  }

  private stringifyValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'n/a';
    }
    if (typeof value === 'string') {
      return value.length > 40 ? `${value.slice(0, 37)}...` : value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      const json = JSON.stringify(value);
      return json.length > 60 ? `${json.slice(0, 57)}...` : json;
    } catch (error) {
      this.logger.debug(`Failed to stringify value for local provider: ${error}`);
      return '[complex value]';
    }
  }
}
