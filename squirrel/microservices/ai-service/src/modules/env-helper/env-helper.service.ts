import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../shared/providers/ai-provider.service';
import { EnvHelperDto } from './dto/env-helper.dto';

export interface EnvSuggestion {
  variable: string;
  description: string;
  sampleValue: string;
  replaces: string[];
}

@Injectable()
export class EnvHelperService {
  private readonly logger = new Logger(EnvHelperService.name);

  constructor(private readonly providerService: AiProviderService) {}

  async suggest(dto: EnvHelperDto) {
    const suggestions = this.deriveSuggestions(dto);
    const aiSummary = await this.providerService.generateCompletion({
      task: 'env-helper',
      input: dto.apiCalls.join('\n'),
      context: { suggestions },
    });

    return {
      suggestions,
      aiSummary: {
        provider: aiSummary.provider,
        model: aiSummary.model,
        output: aiSummary.output,
      },
    };
  }

  private deriveSuggestions(dto: EnvHelperDto): EnvSuggestion[] {
    const suggestions: EnvSuggestion[] = [];
    const baseUrlHint = dto.apiCalls.find((call) => call.includes('https://') || call.includes('http://'));
    if (baseUrlHint) {
      const base = baseUrlHint.replace(/https?:\/\//, '').split('/')[0];
      suggestions.push({
        variable: 'API_BASE_URL',
        description: 'Primary backend base URL used for API requests.',
        sampleValue: `https://${base}`,
        replaces: [baseUrlHint],
      });
    }

    if (dto.apiCalls.some((call) => call.toLowerCase().includes('token') || call.includes('Authorization'))) {
      suggestions.push({
        variable: 'API_TOKEN',
        description: 'Reusable bearer token or API key placeholder.',
        sampleValue: 'sk-xxxxx',
        replaces: ['Authorization: Bearer <token>'],
      });
    }

    if (dto.hints?.length) {
      dto.hints.forEach((hint) => {
        const varName = hint.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
        suggestions.push({
          variable: varName,
          description: `Hint derived from user input: ${hint}`,
          sampleValue: '<value>',
          replaces: [hint],
        });
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        variable: 'API_KEY',
        description: 'Generic API key for authenticated calls.',
        sampleValue: '<your-api-key>',
        replaces: dto.apiCalls,
      });
    }

    this.logger.debug(`Env helper generated ${suggestions.length} suggestions`);
    return suggestions;
  }
}
