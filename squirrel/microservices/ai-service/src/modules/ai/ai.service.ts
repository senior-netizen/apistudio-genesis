import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../../config/redis.service';
import { AdvisorService } from '../advisor/advisor.service';
import { AdvisorRequestDto } from '../advisor/dto/http-transaction.dto';
import { ComposerService, ComposedRequestSuggestion } from '../composer/composer.service';
import { ComposeRequestDto } from '../composer/dto/compose-request.dto';
import { EnvHelperService } from '../env-helper/env-helper.service';
import { EnvHelperDto } from '../env-helper/dto/env-helper.dto';
import { OptimizerService } from '../optimizer/optimizer.service';
import { OptimizerDto } from '../optimizer/dto/optimizer.dto';
import { TestsService } from '../tests/tests.service';
import { TestGenerationDto } from '../tests/dto/test-generation.dto';
import { AiProviderService } from '../../shared/providers/ai-provider.service';
import { GenerateAdvisorResponseDto } from './dto/generate-advisor-response.dto';
import { GenerateComposerDto } from './dto/generate-composer.dto';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly advisorService: AdvisorService,
    private readonly composerService: ComposerService,
    private readonly testsService: TestsService,
    private readonly envHelperService: EnvHelperService,
    private readonly optimizerService: OptimizerService,
    private readonly aiProviderService: AiProviderService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe('ai.advisor.response', (message) => {
      this.logger.log(`Streaming AI advisor response: ${JSON.stringify(message)}`);
    });
  }

  async generateAdvisorResponse(payload: GenerateAdvisorResponseDto) {
    this.logger.log(`Generating advisor response for workspace ${payload.workspaceId}`);
    const advisorPayload = payload.advisorRequest ?? this.buildAdvisorPayloadFromLegacyPrompt(payload);
    const result = await this.advisorService.analyze(advisorPayload);
    await this.redisService.publish('ai.advisor.response', {
      workspaceId: payload.workspaceId,
      result,
    });
    return {
      status: 'completed',
      provider: this.aiProviderService.activeProviderName,
      data: result,
    };
  }

  async generateComposerOutput(payload: GenerateComposerDto) {
    const explicitRequest = payload.composerRequest ?? this.buildComposerRequestFromLegacyPayload(payload);
    const endpoint = this.configService.get('AI_COMPOSER_ENDPOINT');
    let composed: ComposedRequestSuggestion;

    if (endpoint) {
      // Legacy remote pipeline preserved for backwards compatibility.
      this.logger.log('AI_COMPOSER_ENDPOINT configured – attempting remote composer call');
      composed = await this.invokeRemoteComposer(endpoint, payload);
    } else {
      this.logger.log('Using local composer service pipeline');
      composed = await this.composerService.compose(explicitRequest);
    }

    await this.redisService.publish('ai.composer.generated', {
      workspaceId: payload.workspaceId,
      composed,
    });

    return {
      status: 'completed',
      provider: this.aiProviderService.activeProviderName,
      data: composed,
    };
  }

  async generateTests(payload: TestGenerationDto) {
    const result = await this.testsService.generate(payload);
    return {
      status: 'completed',
      provider: this.aiProviderService.activeProviderName,
      data: result,
    };
  }

  async generateEnvSuggestions(payload: EnvHelperDto) {
    const result = await this.envHelperService.suggest(payload);
    return {
      status: 'completed',
      provider: this.aiProviderService.activeProviderName,
      data: result,
    };
  }

  async generateOptimizerSuggestions(payload: OptimizerDto) {
    const result = await this.optimizerService.suggest(payload);
    return {
      status: 'completed',
      provider: this.aiProviderService.activeProviderName,
      data: result,
    };
  }

  private buildAdvisorPayloadFromLegacyPrompt(payload: GenerateAdvisorResponseDto): AdvisorRequestDto {
    this.logger.warn('Legacy advisor payload detected – constructing minimal request/response context');
    return {
      request: {
        method: 'POST',
        url: payload.prompt,
        headers: { 'X-Legacy-Prompt': 'true' },
        body: payload.contextMessages,
      },
      response: {
        status: 500,
        errorMessage: payload.contextMessages?.join(' ') ?? 'Unknown error from legacy payload',
      },
      workspaceId: payload.workspaceId,
    };
  }

  private buildComposerRequestFromLegacyPayload(payload: GenerateComposerDto): ComposeRequestDto {
    this.logger.warn('Legacy composer payload detected – constructing natural language prompt');
    const description =
      payload.description ??
      `Generate request for target API ${payload.targetApi} using seed: ${JSON.stringify(payload.seedRequest ?? {})}`;
    return {
      description,
      baseUrl: payload.seedRequest?.['baseUrl'] as string | undefined,
      samplePayload: (payload.seedRequest as Record<string, unknown>) ?? undefined,
    };
  }

  private async invokeRemoteComposer(endpoint: string, payload: GenerateComposerDto) {
    const response = await firstValueFrom(
      this.http.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.configService.get('OPENAI_API_KEY')}`,
        },
      }),
    );
    return response.data as ComposedRequestSuggestion;
  }
}
