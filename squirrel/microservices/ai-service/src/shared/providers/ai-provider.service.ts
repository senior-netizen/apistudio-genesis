import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, isObservable } from 'rxjs';
import { AiCompletionPayload, AiCompletionResult, AiProvider } from './ai-provider.interface';
import { LocalAiProvider } from './local-ai.provider';
import { NullAiProvider } from './null-ai.provider';
import { RemoteAiProvider } from './remote-ai.provider';

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private provider: AiProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localProvider: LocalAiProvider,
    private readonly remoteProvider: RemoteAiProvider,
    private readonly nullProvider: NullAiProvider,
  ) {
    this.provider = this.resolveProvider();
  }

  async generateCompletion(payload: AiCompletionPayload): Promise<AiCompletionResult> {
    const completion = this.provider.generateCompletion(payload);
    const result = isObservable(completion) ? await firstValueFrom(completion) : await completion;
    return { ...result, provider: this.provider.name };
  }

  get activeProviderName(): string {
    return this.provider.name;
  }

  private resolveProvider(): AiProvider {
    const configured = this.configService.get<string>('AI_PROVIDER') ?? 'local';
    this.logger.log(`Bootstrapping AI provider (${configured})`);

    if (configured === 'remote') {
      this.assertRemoteProviderConfiguration();
      this.logger.log('Using remote AI provider');
      return this.remoteProvider;
    }

    if (configured === 'local') {
      this.logger.log('Using local heuristic AI provider');
      return this.localProvider;
    }

    this.logger.warn(`Unknown AI_PROVIDER value "${configured}". Falling back to disabled provider.`);
    return this.nullProvider;
  }

  private assertRemoteProviderConfiguration(): void {
    const endpoint = this.configService.get<string>('AI_REMOTE_API_URL');
    const apiKey = this.configService.get<string>('AI_REMOTE_API_KEY');
    const nodeEnv = (this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development').toLowerCase();

    if (endpoint && apiKey) {
      return;
    }

    const message =
      'AI_PROVIDER=remote requires AI_REMOTE_API_URL and AI_REMOTE_API_KEY to be configured.';

    if (nodeEnv === 'production') {
      throw new InternalServerErrorException(message);
    }

    this.logger.warn(`${message} Falling back behavior may return degraded responses outside production.`);
  }
}
